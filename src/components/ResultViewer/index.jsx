import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import STLViewer from '../STLViewer/STLViewerR3F';
import styles from './ResultViewer.module.css';
import { STL_FILES, MODEL_GROUPS, RETRY_REPLACE_TOOLTIPS } from './constants';

import Header from './components/Header';
import EmptyState from './components/EmptyState';
import ProgressState from './components/ProgressState';
import ModelExplorer from './components/ModelExplorer';
import ViewerToolbar from './components/ViewerToolbar';
import ConfirmModal, { CONFIRM_MODAL_MODE } from './components/ConfirmModal';
import ReplaceDialog from '../ReplaceDialog';
import { useDownloadZip } from './hooks/useDownloadZip';
import {
  applyFileOverrides,
  formatOption,
  getInitialViewerSelection,
  getResultStatusBadge,
  getRunFileIdentityKey,
} from './utils';
import { RUN_STATUS, canMutateRun } from './runLifecycle';
import {
  areExpectedDownloadsReady,
  getResumeDownloadInvalidationIdentities,
  getResumeOverrideInvalidationIdentities,
  getSelectionForResumeStep,
} from './resumeInvalidation';
import useProgressSimulation from './hooks/useProgressSimulation';
import useRunPolling from './hooks/useRunPolling';
import useRunFiles from './hooks/useRunFiles';
import useRunLoadingState from './hooks/useRunLoadingState';
import useResumeActions, { RESUME_ACTION } from './hooks/useResumeActions';
import useFileOverrides from './hooks/useFileOverrides';
import useStageReadyNotifications from './hooks/useStageReadyNotifications';
import StageReadyToast from './components/StageReadyToast';

const ResultViewer = ({
  resultUrl,
  scanData,
  onGoHome,
  onGoBack,
  onSetResultUrl,
  sampleResultUrl,
}) => {
  const originalFile  = scanData?.scan1;
  const secondFile    = scanData?.scan2;
  const shieldOption  = scanData?.shieldOption;

  const initialRunId = scanData?.runId ?? null;
  const usingBackendProgress = Boolean(initialRunId);

  const [autoRotate,  setAutoRotate]  = useState(false);
  const [activeView, setActiveView] = useState(null);
  const [viewerKey,   setViewerKey]   = useState(0);
  const [selectedFiles, setSelectedFiles] = useState(() =>
    usingBackendProgress ? [] : [STL_FILES[STL_FILES.length - 1]]
  );
  const [actionsViewerReady, setActionsViewerReady] = useState(false);
  const hasAutoSelectedRef = useRef(false);
  /** Exact identity keys to restore after Retry/Replace (preferred over stage). */
  const pendingResumeSelectionIdentitiesRef = useRef(null);
  /** Stage-level fallback when identity list is unavailable. */
  const pendingResumeSelectionStepRef = useRef(null);

  const invalidateIdentitiesRef = useRef(null);
  const invalidateOverridesRef = useRef(null);
  const applyReplaceOverridesRef = useRef(null);
  /** Fed into useResumeActions so session unlock waits for regenerated blobs. */
  const [downloadsReadyFlag, setDownloadsReadyFlag] = useState(false);

  const accentColor = '#E8D5C3';

  const {
    fileOverrides,
    applyReplaceOverrides,
    invalidateOverrides,
    clearOverrides,
  } = useFileOverrides({ resetKey: initialRunId });

  applyReplaceOverridesRef.current = applyReplaceOverrides;
  invalidateOverridesRef.current = invalidateOverrides;

  /**
   * Coordinated resume sync — runs before activeRunId switches:
   * invalidate downstream cache + overrides, then attach Replace blobs.
   */
  const handleResumeSuccess = useCallback(
    ({
      resumeStep,
      replacementFiles,
      selectedFiles: selectedForReplace,
      selectionForRestore = null,
    }) => {
      if (resumeStep === null || resumeStep === undefined) return;

      invalidateIdentitiesRef.current?.(
        getResumeDownloadInvalidationIdentities(resumeStep)
      );
      invalidateOverridesRef.current?.(
        getResumeOverrideInvalidationIdentities(resumeStep)
      );

      const restoreSource =
        selectionForRestore?.length > 0
          ? selectionForRestore
          : selectedForReplace;

      pendingResumeSelectionIdentitiesRef.current =
        restoreSource?.length > 0
          ? restoreSource.map((file) => getRunFileIdentityKey(file.name))
          : null;
      pendingResumeSelectionStepRef.current = resumeStep;
      setDownloadsReadyFlag(false);

      if (replacementFiles && selectedForReplace?.length) {
        applyReplaceOverridesRef.current?.(
          selectedForReplace,
          replacementFiles
        );
      }
    },
    []
  );

  const {
    activeRunId,
    setRunSnapshot,
    preserveRunState,
    resumeSessionActive,
    resumeTransition,
    resumeStep,
    resumeStageTitle,
    actionsLocked,
    isResuming,
    resumeError,
    canRetry,
    canReplace,
    tooltip,
    openRetry,
    openReplace,
    confirmModal,
    replaceDialog,
  } = useResumeActions({
    selectedFiles,
    viewerReady: actionsViewerReady,
    initialRunId,
    onResumeSuccess: handleResumeSuccess,
    downloadsReady: downloadsReadyFlag,
  });

  const {
    currentStep: runCurrentStep,
    status: runStatus,
    files: runFiles,
    error: runError,
  } = useRunPolling(activeRunId, {
    preserveStateOnRunChange: preserveRunState,
    // resumeStep + 1 keeps the retried stage visible (progressStep < currentStep).
    seedCurrentStep:
      resumeStep === null || resumeStep === undefined
        ? null
        : resumeStep + 1,
  });

  useEffect(() => {
    setRunSnapshot({ status: runStatus, currentStep: runCurrentStep });
  }, [runStatus, runCurrentStep, setRunSnapshot]);

  const { downloadedFiles, invalidateIdentities } = useRunFiles(
    activeRunId,
    runFiles,
    {
      preserveCache: preserveRunState,
      status: runStatus,
      currentStep: runCurrentStep,
      resumeSessionActive,
      resumeStep,
      resumeTransition,
    }
  );

  invalidateIdentitiesRef.current = invalidateIdentities;

  const effectiveFiles = useMemo(
    () => applyFileOverrides(downloadedFiles, fileOverrides),
    [downloadedFiles, fileOverrides]
  );

  const downloadsReady = useMemo(
    () =>
      areExpectedDownloadsReady(
        downloadedFiles,
        resumeSessionActive || resumeStageTitle ? resumeStep : null
      ),
    [
      downloadedFiles,
      resumeSessionActive,
      resumeStageTitle,
      resumeStep,
    ]
  );

  useEffect(() => {
    setDownloadsReadyFlag(downloadsReady);
  }, [downloadsReady]);

  const {
    progressPercentage: backendProgressPercentage,
    loadingMessage: backendLoadingMessage,
    viewerReady,
    visibleGroups,
  } = useRunLoadingState({
    runId: activeRunId,
    status: runStatus,
    currentStep: runCurrentStep,
    downloadedFiles: effectiveFiles,
    preserveViewer: preserveRunState,
    resumeSessionActive,
    resumeStep,
  });

  const {
    current: stageReadyToast,
    isExiting: stageReadyToastExiting,
  } = useStageReadyNotifications(
    usingBackendProgress ? visibleGroups : []
  );

  const simulatedProgress = useProgressSimulation({
    scanData: usingBackendProgress ? null : scanData,
    resultUrl,
    sampleResultUrl,
    onSetResultUrl,
  });

  useEffect(() => {
    if (runError) {
      console.error('Run polling error:', runError);
    }
  }, [runError]);

  const {
    progressIndex,
    progressPercentage,
    currentStep,
    totalSteps,
  } = usingBackendProgress
    ? {
        progressIndex: 0,
        progressPercentage: backendProgressPercentage,
        currentStep: backendLoadingMessage,
        totalSteps: null,
      }
    : simulatedProgress;

  const canRenderBackend = usingBackendProgress && viewerReady;
  const canRenderSimulated = !usingBackendProgress && Boolean(resultUrl);
  const canRender = canRenderBackend || canRenderSimulated;

  useEffect(() => {
    setActionsViewerReady(canRender);
  }, [canRender]);

  const isWaitingForResult = usingBackendProgress
    ? Boolean(scanData && !canRenderBackend)
    : Boolean(scanData && !resultUrl);

  const statusBadge = useMemo(
    () =>
      getResultStatusBadge({
        status: usingBackendProgress
          ? runStatus
          : canRender
            ? RUN_STATUS.DONE
            : null,
        currentStep: usingBackendProgress ? runCurrentStep : null,
        resumeSessionActive,
        resumeStageTitle: usingBackendProgress ? resumeStageTitle : null,
        isResuming: usingBackendProgress && isResuming,
        hasRunId: usingBackendProgress,
        downloadsReady: usingBackendProgress ? downloadsReady : true,
      }),
    [
      usingBackendProgress,
      runStatus,
      runCurrentStep,
      resumeSessionActive,
      resumeStageTitle,
      isResuming,
      canRender,
      downloadsReady,
    ]
  );

  // Reset auto-select + pending restore only on a brand-new scan run.
  // Declared before auto-select so mount order cannot clear the once-per-run flag.
  useEffect(() => {
    hasAutoSelectedRef.current = false;
    pendingResumeSelectionIdentitiesRef.current = null;
    pendingResumeSelectionStepRef.current = null;
  }, [initialRunId]);

  // Once-per-run default: Reoriented Maxilla + Mandible. Never re-runs after resume.
  useEffect(() => {
    if (!usingBackendProgress) return;
    if (hasAutoSelectedRef.current) return;
    if (!viewerReady) return;
    if (resumeSessionActive || resumeTransition) {
      return;
    }

    const initialSelection = getInitialViewerSelection(effectiveFiles);
    if (initialSelection.length === 0) return;

    hasAutoSelectedRef.current = true;
    setSelectedFiles(initialSelection);
  }, [
    usingBackendProgress,
    viewerReady,
    effectiveFiles,
    resumeSessionActive,
    resumeTransition,
  ]);

  // Selection: remap by id/identity; restore exact resume identities when gaps appear.
  useEffect(() => {
    setSelectedFiles((prev) => {
      const byId = new Map(effectiveFiles.map((file) => [file.id, file]));
      const byIdentity = new Map(
        effectiveFiles.map((file) => [
          getRunFileIdentityKey(file.name),
          file,
        ])
      );

      const selectionUnchanged = (next) =>
        next.length === prev.length &&
        next.every(
          (file, index) =>
            file.objectUrl === prev[index]?.objectUrl &&
            file.metadata?.status === prev[index]?.metadata?.status
        );

      const pendingIdentities = pendingResumeSelectionIdentitiesRef.current;

      // Prefer exact pre-resume identities over stage-wide restore.
      if (pendingIdentities?.length) {
        const restored = pendingIdentities
          .map((identity) => byIdentity.get(identity))
          .filter(Boolean);

        if (restored.length === pendingIdentities.length) {
          pendingResumeSelectionIdentitiesRef.current = null;
          pendingResumeSelectionStepRef.current = null;
          return selectionUnchanged(restored) ? prev : restored;
        }

        if (restored.length > 0) {
          return selectionUnchanged(restored) ? prev : restored;
        }
      }

      const remapped = prev
        .map(
          (file) =>
            byId.get(file.id) ||
            byIdentity.get(getRunFileIdentityKey(file.name))
        )
        .filter(Boolean);

      // Dedupe if id+identity both matched the same file.
      const seen = new Set();
      const unique = remapped.filter((file) => {
        const key = file.id || getRunFileIdentityKey(file.name);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (unique.length > 0) {
        // Do not clear pending identities while still waiting for the full set.
        if (!pendingIdentities?.length) {
          pendingResumeSelectionStepRef.current = null;
        }
        return selectionUnchanged(unique) ? prev : unique;
      }

      // Stage fallback only when we have no exact identity intent.
      if (!pendingIdentities?.length) {
        const pendingStep = pendingResumeSelectionStepRef.current;
        if (pendingStep != null) {
          const restored = getSelectionForResumeStep(
            effectiveFiles,
            pendingStep
          );
          if (restored.length > 0) {
            pendingResumeSelectionStepRef.current = null;
            return selectionUnchanged(restored) ? prev : restored;
          }
        }
      }

      return unique;
    });
  }, [effectiveFiles]);

  const selectedPaths = useMemo(
    () =>
      selectedFiles.map((f) =>
        f.objectUrl ? { url: f.objectUrl, extension: f.extension } : f.path
      ),
    [selectedFiles]
  );

  const { isDownloading, downloadZip } = useDownloadZip(selectedFiles);

  const handleReset = () => {
    setActiveView(null);
    setViewerKey((k) => k + 1);
  };

  const toggleFileSelection = (file) => {
    setSelectedFiles((prev) => {
      const isSelected = prev.some((f) => f.id === file.id);

      if (isSelected) {
        return prev.filter((f) => f.id !== file.id);
      }

      return [...prev, file];
    });
  };

  /** Select / complete / deselect all available files in a jaw stage group. */
  const toggleGroupSelection = (sectionFiles = []) => {
    if (!sectionFiles.length) return;

    const groupIds = new Set(sectionFiles.map((f) => f.id));

    setSelectedFiles((prev) => {
      const selectedInPrev = sectionFiles.filter((f) =>
        prev.some((p) => p.id === f.id)
      );

      if (selectedInPrev.length === sectionFiles.length) {
        return prev.filter((f) => !groupIds.has(f.id));
      }

      // None or partial → add missing files in the group.
      const selectedIds = new Set(prev.map((f) => f.id));
      const missing = sectionFiles.filter((f) => !selectedIds.has(f.id));
      return [...prev, ...missing];
    });
  };

  // Lock nav while a run is unsettled (queued/pending/running) or resume is active.
  const runProcessing =
    Boolean(activeRunId) && !canMutateRun(runStatus);
  const navLocked = actionsLocked || runProcessing;
  const navLockedTooltip = actionsLocked
    ? tooltip || RETRY_REPLACE_TOOLTIPS.NAV_LOCKED
    : RETRY_REPLACE_TOOLTIPS.NAV_LOCKED;

  const handleGoHome = () => {
    if (navLocked) return;
    clearOverrides();
    onGoHome?.();
  };

  const handleGoBack = () => {
    if (navLocked) return;
    clearOverrides();
    onGoBack?.();
  };

  const handleRetryConfirm = async () => {
    await confirmModal.onConfirm?.();
    // Invalidation already ran in onResumeSuccess before runId switch.
  };

  const handleReplaceConfirm = async (payload) => {
    await replaceDialog.onConfirm(payload);
  };

  const isProcessingInfoModal =
    confirmModal.mode === CONFIRM_MODAL_MODE.INFO;

  return (
    <div className={styles.container}>

      <Header
        canRender={canRender}
        onGoHome={handleGoHome}
        onGoBack={handleGoBack}
        onDownload={downloadZip}
        isDownloading={isDownloading}
        selectedCount={selectedFiles.length}
        canRetry={canRetry}
        canReplace={canReplace}
        actionTooltip={tooltip}
        onRetry={openRetry}
        onReplace={openReplace}
        navLocked={navLocked}
        navLockedTooltip={navLockedTooltip}
        statusBadge={statusBadge}
      />

      <StageReadyToast
        current={stageReadyToast}
        exiting={stageReadyToastExiting}
      />

      {resumeError ? (
        <p className={styles.resumeError} role="alert">
          {resumeError}
        </p>
      ) : null}

      <div className={styles.viewerContainer}>
        <div className={styles.viewerInner}>
          {canRender ? (
            <>
              <div className={styles.viewerLayout}>
                <div className={styles.viewerPane}>
                  <STLViewer
                    key={viewerKey}
                    stlUrls={selectedPaths}
                    accentColor={accentColor}
                    background="#07111F"
                    autoRotate={autoRotate}
                    showGrid={false}
                    enablePan={true}
                  />
                </div>
                <ModelExplorer
                  sections={usingBackendProgress ? visibleGroups : undefined}
                  files={usingBackendProgress ? undefined : STL_FILES}
                  groups={usingBackendProgress ? undefined : MODEL_GROUPS}
                  selectedFiles={selectedFiles}
                  onToggle={toggleFileSelection}
                  onToggleGroup={toggleGroupSelection}
                />
              </div>
            </>
          ) : isWaitingForResult ? (
            <ProgressState
              progressPercentage={progressPercentage}
              currentStep={currentStep}
              progressIndex={progressIndex}
              totalSteps={totalSteps}
              showStepCount={!usingBackendProgress}
              subtitle={
                usingBackendProgress
                  ? 'Your first models will appear shortly.'
                  : undefined
              }
            />
          ) : (
            <EmptyState
              originalFile={originalFile}
              secondFile={secondFile}
              shieldOption={shieldOption}
              formatOption={formatOption}
            />
          )}

        </div>

        <ViewerToolbar
          canRender={canRender}
          autoRotate={autoRotate}
          activeView={activeView}
          setActiveView={setActiveView}
          onToggleRotate={() => setAutoRotate((v) => !v)}
          onReset={handleReset}
        />
      </div>

      <ConfirmModal
        open={confirmModal.open}
        mode={confirmModal.mode}
        title={confirmModal.title}
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel={confirmModal.cancelLabel}
        dismissLabel={confirmModal.dismissLabel}
        onConfirm={handleRetryConfirm}
        onCancel={confirmModal.onCancel}
        confirmDisabled={confirmModal.confirmDisabled}
      >
        {isProcessingInfoModal ? (
          <>
            <p>AI is still generating the models.</p>
            {confirmModal.currentStepTitle ? (
              <p>
                Current step: <strong>{confirmModal.currentStepTitle}</strong>
              </p>
            ) : null}
            <p>
              {confirmModal.action === RESUME_ACTION.REPLACE
                ? 'Please wait until processing completes before replacing the model.'
                : 'Please wait until processing completes before retrying.'}
            </p>
          </>
        ) : (
          <p>
            Are you sure you want to retry from{' '}
            <strong>{confirmModal.stageTitle || 'this stage'}</strong>?
          </p>
        )}
      </ConfirmModal>

      <ReplaceDialog
        open={replaceDialog.open}
        selection={replaceDialog.selection}
        onCancel={replaceDialog.onCancel}
        onConfirm={handleReplaceConfirm}
      />

    </div>
  );
};


export default ResultViewer;
