import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { resumeRun } from '../../../api/runs';
import { RETRY_REPLACE_TOOLTIPS, SELECTION_MODE } from '../constants';
import { CONFIRM_MODAL_MODE } from '../components/ConfirmModal';
import { evaluateRetryReplaceSelection } from '../resumeSelection';
import {
  areRetryParametersValid,
  extractRetryParameters,
  isAllowedNumericDraftInput,
} from '../retryParameters';

const RETRY_PARAMETERS_INVALID_TITLE =
  'Enter a valid number for every parameter.';
import {
  RUN_STATUS,
  canMutateRun,
  deriveRunLifecycle,
} from '../runLifecycle';
import { getPipelineStepTitle } from '../utils';

/**
 * Maps ReplaceDialog / Retry payloads into the resumeRun() API shape.
 */
export const buildResumeApiPayload = ({
  fromStep,
  replacementFiles = null,
  selectionMode = null,
  parameters = null,
}) => {
  const payload = { fromStep };

  if (parameters && Object.keys(parameters).length > 0) {
    payload.parameters = parameters;
  }

  if (!replacementFiles) {
    return payload;
  }

  if (selectionMode === SELECTION_MODE.SINGLE) {
    if (replacementFiles.attachment) {
      payload.file = replacementFiles.attachment;
    }
    return payload;
  }

  if (replacementFiles.maxilla) {
    payload.maxilla = replacementFiles.maxilla;
  }
  if (replacementFiles.mandible) {
    payload.mandible = replacementFiles.mandible;
  }

  return payload;
};

export const RESUME_ACTION = {
  RETRY: 'retry',
  REPLACE: 'replace',
};

/**
 * Owns Retry / Replace dialogs + Resume API + seamless run transition.
 *
 * onResumeSuccess is invoked SYNCHRONOUSLY after the API succeeds and
 * BEFORE activeRunId switches, so cache invalidation wins the race against
 * the first poll of the new run (which lists the entire shared folder).
 *
 * Run lifecycle is fed from useRunPolling (via setRunSnapshot). Mutations
 * are blocked while the backend status is not settled.
 */
const useResumeActions = ({
  selectedFiles = [],
  viewerReady = false,
  initialRunId = null,
  onResumeSuccess = null,
  downloadsReady = true,
  /** Ref to latest poll files[] (parameters source). Read only at openRetry. */
  runFilesRef = null,
}) => {
  const [activeRunId, setActiveRunId] = useState(initialRunId);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmModalMode, setConfirmModalMode] = useState(
    CONFIRM_MODAL_MODE.CONFIRM
  );
  const [confirmModalAction, setConfirmModalAction] = useState(null);
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [retrySnapshot, setRetrySnapshot] = useState(null);
  const [replaceSnapshot, setReplaceSnapshot] = useState(null);

  const [isResuming, setIsResuming] = useState(false);
  const [resumeTransition, setResumeTransition] = useState(false);
  const [resumeSessionActive, setResumeSessionActive] = useState(false);
  const [resumeStep, setResumeStep] = useState(null);
  const [resumeStageTitle, setResumeStageTitle] = useState(null);
  const [resumeError, setResumeError] = useState(null);
  const [runStatus, setRunStatus] = useState(null);
  const [runCurrentStep, setRunCurrentStep] = useState(null);

  // Latest poll snapshot for hard-guard (avoids stale closures at confirm time).
  const runSnapshotRef = useRef({ status: null, currentStep: null });

  const setRunSnapshot = useCallback(({ status = null, currentStep = null }) => {
    runSnapshotRef.current = { status, currentStep };
    setRunStatus(status);
    setRunCurrentStep(currentStep);
  }, []);

  const resetConfirmModal = useCallback(() => {
    setConfirmModalOpen(false);
    setConfirmModalMode(CONFIRM_MODAL_MODE.CONFIRM);
    setConfirmModalAction(null);
    setRetrySnapshot(null);
  }, []);

  useEffect(() => {
    setActiveRunId(initialRunId);
    setIsResuming(false);
    setResumeTransition(false);
    setResumeSessionActive(false);
    setResumeStep(null);
    setResumeStageTitle(null);
    setResumeError(null);
    resetConfirmModal();
    setReplaceDialogOpen(false);
    setReplaceSnapshot(null);
    runSnapshotRef.current = { status: null, currentStep: null };
    setRunStatus(null);
    setRunCurrentStep(null);
  }, [initialRunId, resetConfirmModal]);

  // Clear hand-off only once polling has seeded the NEW run as running.
  // Do NOT clear on the previous run's mirrored status=done — that would
  // reopen a one-render window where downloads could refetch stale folder bytes.
  useEffect(() => {
    if (!resumeTransition) return;
    if (runStatus === RUN_STATUS.RUNNING) {
      setResumeTransition(false);
    }
  }, [resumeTransition, runStatus]);

  const runLifecycle = useMemo(
    () => deriveRunLifecycle(runStatus),
    [runStatus]
  );

  // Unlock only when terminal AND regenerated downloads are present.
  useEffect(() => {
    if (!resumeSessionActive) return;
    if (runLifecycle.failed) {
      setResumeSessionActive(false);
      return;
    }
    if (runLifecycle.completed && downloadsReady) {
      setResumeSessionActive(false);
    }
  }, [resumeSessionActive, runLifecycle.failed, runLifecycle.completed, downloadsReady]);

  // If the run settles while the processing info modal is open, dismiss it.
  useEffect(() => {
    if (
      confirmModalOpen &&
      confirmModalMode === CONFIRM_MODAL_MODE.INFO &&
      runLifecycle.settled
    ) {
      resetConfirmModal();
    }
  }, [
    confirmModalOpen,
    confirmModalMode,
    runLifecycle.settled,
    resetConfirmModal,
  ]);

  const evaluation = useMemo(
    () =>
      evaluateRetryReplaceSelection(selectedFiles, {
        viewerReady,
      }),
    [selectedFiles, viewerReady]
  );

  const actionsLocked = isResuming || resumeTransition || resumeSessionActive;

  const actionTooltip = actionsLocked
    ? isResuming
      ? RETRY_REPLACE_TOOLTIPS.RESUME_IN_FLIGHT
      : RETRY_REPLACE_TOOLTIPS.PROCESSING
    : evaluation.tooltip;

  const preserveRunState =
    resumeTransition || resumeSessionActive || isResuming;

  const openProcessingInfoModal = useCallback((action) => {
    setResumeError(null);
    setReplaceDialogOpen(false);
    setReplaceSnapshot(null);
    setRetrySnapshot(null);
    setConfirmModalAction(action);
    setConfirmModalMode(CONFIRM_MODAL_MODE.INFO);
    setConfirmModalOpen(true);
  }, []);

  /** Backend runs only — simulated/demo paths have no poll lifecycle. */
  const isRunStillProcessing = useCallback(() => {
    if (!activeRunId) return false;
    return !canMutateRun(runSnapshotRef.current.status);
  }, [activeRunId]);

  const openRetry = useCallback(() => {
    if (actionsLocked || !evaluation.canRetry) return;

    if (isRunStillProcessing()) {
      openProcessingInfoModal(RESUME_ACTION.RETRY);
      return;
    }

    setResumeError(null);
    setConfirmModalAction(RESUME_ACTION.RETRY);
    setConfirmModalMode(CONFIRM_MODAL_MODE.CONFIRM);
    // Freeze poll parameters at open — dialog must not track live polls.
    const parameterDraft = extractRetryParameters(
      runFilesRef?.current || [],
      selectedFiles
    );
    setRetrySnapshot({
      selectedFiles: [...selectedFiles],
      stageTitle: evaluation.stageTitle,
      resumeStep: evaluation.resumeStep,
      actionKey: evaluation.actionKey,
      selectionMode: evaluation.selectionMode,
      parameterDraft,
    });
    setConfirmModalOpen(true);
  }, [
    actionsLocked,
    evaluation,
    selectedFiles,
    openProcessingInfoModal,
    isRunStillProcessing,
    runFilesRef,
  ]);

  const updateRetryParameter = useCallback((key, value) => {
    if (!isAllowedNumericDraftInput(value)) return;
    setRetrySnapshot((prev) => {
      if (!prev?.parameterDraft || !(key in prev.parameterDraft)) return prev;
      return {
        ...prev,
        parameterDraft: {
          ...prev.parameterDraft,
          [key]: value,
        },
      };
    });
  }, []);

  const closeConfirmModal = useCallback(() => {
    if (isResuming) return;
    resetConfirmModal();
  }, [isResuming, resetConfirmModal]);

  const openReplace = useCallback(() => {
    if (actionsLocked || !evaluation.canReplace) return;

    if (isRunStillProcessing()) {
      openProcessingInfoModal(RESUME_ACTION.REPLACE);
      return;
    }

    setResumeError(null);
    setConfirmModalOpen(false);
    setConfirmModalMode(CONFIRM_MODAL_MODE.CONFIRM);
    setConfirmModalAction(null);
    setRetrySnapshot(null);
    setReplaceSnapshot({
      selectedFiles: [...selectedFiles],
      stageTitle: evaluation.stageTitle,
      resumeStep: evaluation.resumeStep,
      actionKey: evaluation.actionKey,
      selectionMode: evaluation.selectionMode,
    });
    setReplaceDialogOpen(true);
  }, [
    actionsLocked,
    evaluation,
    selectedFiles,
    openProcessingInfoModal,
    isRunStillProcessing,
  ]);

  const closeReplace = useCallback(() => {
    if (isResuming) return;
    setReplaceDialogOpen(false);
    setReplaceSnapshot(null);
  }, [isResuming]);

  const executeResume = useCallback(
    async ({
      fromStep,
      selectionMode,
      replacementFiles,
      stageTitle,
      selectedForReplace,
      selectionForRestore = null,
      parameters = null,
    }) => {
      if (!activeRunId || fromStep === null || fromStep === undefined) {
        throw new Error('Missing run id or from_step for resume.');
      }

      // Hard guard — never call /resume while the run is still processing.
      if (!canMutateRun(runSnapshotRef.current.status)) {
        return null;
      }

      const apiPayload = buildResumeApiPayload({
        fromStep,
        selectionMode,
        replacementFiles,
        parameters,
      });

      setIsResuming(true);
      setResumeError(null);

      let previousStageTitle = null;
      let previousResumeStep = null;
      setResumeStageTitle((prev) => {
        previousStageTitle = prev;
        return stageTitle || null;
      });
      setResumeStep((prev) => {
        previousResumeStep = prev;
        return fromStep;
      });

      try {
        const result = await resumeRun(activeRunId, apiPayload);

        // Invalidate BEFORE switching the polled run id so the first poll
        // cannot re-cache stale downstream identities.
        onResumeSuccess?.({
          resumeStep: fromStep,
          stageTitle,
          replacementFiles,
          selectedFiles: selectedForReplace || null,
          // Exact explorer selection to restore after regenerate (Retry + Replace).
          selectionForRestore:
            selectionForRestore || selectedForReplace || null,
        });

        setResumeTransition(true);
        setResumeSessionActive(true);
        setActiveRunId(result.runId);

        resetConfirmModal();
        setReplaceDialogOpen(false);
        setReplaceSnapshot(null);

        return result;
      } catch (err) {
        setResumeTransition(false);
        setResumeStageTitle(previousStageTitle);
        setResumeStep(previousResumeStep);
        const message =
          err instanceof Error ? err.message : 'Failed to resume run.';
        setResumeError(message);
        throw err;
      } finally {
        setIsResuming(false);
      }
    },
    [activeRunId, onResumeSuccess, resetConfirmModal]
  );

  const confirmRetry = useCallback(async () => {
    if (!retrySnapshot || actionsLocked) return false;
    if (confirmModalMode !== CONFIRM_MODAL_MODE.CONFIRM) return false;

    const parameterDraft = retrySnapshot.parameterDraft || {};
    if (!areRetryParametersValid(parameterDraft)) return false;

    if (isRunStillProcessing()) {
      openProcessingInfoModal(RESUME_ACTION.RETRY);
      return false;
    }

    try {
      const result = await executeResume({
        fromStep: retrySnapshot.resumeStep,
        selectionMode: retrySnapshot.selectionMode,
        replacementFiles: null,
        stageTitle: retrySnapshot.stageTitle,
        selectedForReplace: null,
        selectionForRestore: retrySnapshot.selectedFiles,
        parameters:
          Object.keys(parameterDraft).length > 0 ? parameterDraft : null,
      });
      if (!result) {
        openProcessingInfoModal(RESUME_ACTION.RETRY);
        return false;
      }
      return {
        ok: true,
        resumeStep: retrySnapshot.resumeStep,
        stageTitle: retrySnapshot.stageTitle,
        selectedFiles: retrySnapshot.selectedFiles,
        replacementFiles: null,
        parameters: parameterDraft,
      };
    } catch {
      return false;
    }
  }, [
    retrySnapshot,
    actionsLocked,
    confirmModalMode,
    executeResume,
    openProcessingInfoModal,
    isRunStillProcessing,
  ]);

  const confirmReplace = useCallback(
    async (dialogPayload) => {
      if (!dialogPayload || actionsLocked) return false;

      if (isRunStillProcessing()) {
        setReplaceDialogOpen(false);
        setReplaceSnapshot(null);
        openProcessingInfoModal(RESUME_ACTION.REPLACE);
        return false;
      }

      try {
        const result = await executeResume({
          fromStep: dialogPayload.resumeStep,
          selectionMode: dialogPayload.selectionMode,
          replacementFiles: dialogPayload.replacementFiles,
          stageTitle: dialogPayload.stageTitle,
          selectedForReplace: dialogPayload.selectedFiles,
          selectionForRestore: dialogPayload.selectedFiles,
        });
        if (!result) {
          setReplaceDialogOpen(false);
          setReplaceSnapshot(null);
          openProcessingInfoModal(RESUME_ACTION.REPLACE);
          return false;
        }
        return {
          ok: true,
          resumeStep: dialogPayload.resumeStep,
          stageTitle: dialogPayload.stageTitle,
          selectedFiles: dialogPayload.selectedFiles,
          replacementFiles: dialogPayload.replacementFiles,
        };
      } catch {
        return false;
      }
    },
    [
      actionsLocked,
      executeResume,
      openProcessingInfoModal,
      isRunStillProcessing,
    ]
  );

  const currentStepTitle = getPipelineStepTitle(runCurrentStep);

  const confirmModal = useMemo(() => {
    const isInfo = confirmModalMode === CONFIRM_MODAL_MODE.INFO;
    const isReplaceAction = confirmModalAction === RESUME_ACTION.REPLACE;
    const parameterDraft = retrySnapshot?.parameterDraft ?? {};
    const parametersValid = areRetryParametersValid(parameterDraft);
    const parametersInvalid = !parametersValid;

    if (isInfo) {
      return {
        open: confirmModalOpen,
        mode: CONFIRM_MODAL_MODE.INFO,
        title: isReplaceAction ? 'Replace Unavailable' : 'Retry Unavailable',
        action: confirmModalAction,
        currentStepTitle,
        stageTitle: null,
        parameterDraft: {},
        onParameterChange: undefined,
        onConfirm: undefined,
        onCancel: closeConfirmModal,
        confirmDisabled: true,
        cancelDisabled: false,
        confirmDisabledTitle: undefined,
        confirmLabel: 'OK',
        cancelLabel: 'OK',
        dismissLabel: 'OK',
      };
    }

    return {
      open: confirmModalOpen,
      mode: CONFIRM_MODAL_MODE.CONFIRM,
      title: 'Retry Processing',
      action: RESUME_ACTION.RETRY,
      currentStepTitle: null,
      stageTitle: retrySnapshot?.stageTitle ?? evaluation.stageTitle,
      parameterDraft,
      onParameterChange: updateRetryParameter,
      onConfirm: confirmRetry,
      onCancel: closeConfirmModal,
      confirmDisabled: isResuming || parametersInvalid,
      // Keep Cancel / Escape available while editing invalid params.
      cancelDisabled: isResuming,
      confirmDisabledTitle:
        !isResuming && parametersInvalid
          ? RETRY_PARAMETERS_INVALID_TITLE
          : undefined,
      confirmLabel: isResuming ? 'Retrying…' : 'Retry',
      cancelLabel: 'Cancel',
      dismissLabel: 'OK',
    };
  }, [
    confirmModalOpen,
    confirmModalMode,
    confirmModalAction,
    currentStepTitle,
    retrySnapshot,
    evaluation.stageTitle,
    confirmRetry,
    closeConfirmModal,
    isResuming,
    updateRetryParameter,
  ]);

  return {
    activeRunId,
    setRunSnapshot,

    canRetry: evaluation.canRetry && !actionsLocked,
    canReplace: evaluation.canReplace && !actionsLocked,
    tooltip: actionTooltip,

    actionsLocked,
    isResuming,
    resumeTransition,
    resumeSessionActive,
    resumeStep,
    resumeStageTitle,
    preserveRunState,
    resumeError,
    clearResumeError: () => setResumeError(null),

    openRetry,
    openReplace,

    confirmModal,

    replaceDialog: {
      open: replaceDialogOpen,
      selection: replaceSnapshot?.selectedFiles ?? selectedFiles,
      payload: replaceSnapshot,
      onConfirm: confirmReplace,
      onCancel: closeReplace,
    },
  };
};

export default useResumeActions;
