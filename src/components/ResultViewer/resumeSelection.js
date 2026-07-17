import {
  ATTACHMENT_ACTION_KEYS,
  JAW_STAGE_ACTION_KEYS,
  PIPELINE_STAGE_ACTIONS,
  RETRY_REPLACE_TOOLTIPS,
  SELECTION_MODE,
} from './constants';
import { parseRunFileName } from './utils';

/**
 * Prefer a filename that contains step_XX (backend name or public path),
 * so demo STL_FILES (display name without step) still parse correctly.
 */
export const getFileParseName = (file = {}) => {
  const candidates = [file.name, file.path].filter(Boolean);
  const withStep = candidates.find((value) => /step_\d+/i.test(value));
  if (withStep) {
    return withStep.includes('/') ? withStep.split('/').pop() : withStep;
  }
  if (file.path) return file.path.split('/').pop();
  return file.name || '';
};

/**
 * Resolves the PIPELINE_STAGE_ACTIONS key for a selected model file.
 */
export const getStageActionKey = (file) => {
  const parsed = parseRunFileName(getFileParseName(file));

  if (parsed.kind === 'jaw') {
    return JAW_STAGE_ACTION_KEYS[parsed.pipelineStageId] ?? null;
  }

  if (parsed.kind === 'final') {
    return 'prongPlaced';
  }

  if (parsed.kind === 'attachment') {
    return ATTACHMENT_ACTION_KEYS[parsed.label] ?? null;
  }

  return null;
};

/**
 * Per-file metadata used by Retry / Replace validation.
 */
export const getSelectionMetadata = (selectedFiles = []) =>
  selectedFiles.map((file) => {
    const parseName = getFileParseName(file);
    const parsed = parseRunFileName(parseName);
    const actionKey = getStageActionKey(file);
    const action = actionKey ? PIPELINE_STAGE_ACTIONS[actionKey] : null;

    return {
      file,
      parseName,
      parsed,
      actionKey,
      action,
      stageTitle: action?.title ?? parsed.stageTitle ?? null,
      resumeStep: action?.resumeStep ?? null,
    };
  });

const buildResult = ({
  isValid,
  canRetry,
  canReplace,
  tooltip,
  reason,
  stageTitle = null,
  resumeStep = null,
  actionKey = null,
  selectionMode = null,
  items = [],
}) => ({
  isValid,
  canRetry,
  canReplace,
  tooltip,
  reason,
  stageTitle,
  resumeStep,
  actionKey,
  selectionMode,
  items,
});

/**
 * Validates current Model Explorer selection for Retry / Replace.
 * Business rules live here — not in ResultViewer JSX.
 */
export const evaluateRetryReplaceSelection = (
  selectedFiles = [],
  { viewerReady = true } = {}
) => {
  if (!viewerReady) {
    return buildResult({
      isValid: false,
      canRetry: false,
      canReplace: false,
      tooltip: RETRY_REPLACE_TOOLTIPS.VIEWER_NOT_READY,
      reason: 'VIEWER_NOT_READY',
    });
  }

  if (!selectedFiles.length) {
    return buildResult({
      isValid: false,
      canRetry: false,
      canReplace: false,
      tooltip: RETRY_REPLACE_TOOLTIPS.NO_SELECTION,
      reason: 'NO_SELECTION',
    });
  }

  if (selectedFiles.length > 2) {
    return buildResult({
      isValid: false,
      canRetry: false,
      canReplace: false,
      tooltip: RETRY_REPLACE_TOOLTIPS.TOO_MANY,
      reason: 'TOO_MANY',
    });
  }

  const items = getSelectionMetadata(selectedFiles);

  if (items.some((item) => !item.actionKey || !item.action)) {
    return buildResult({
      isValid: false,
      canRetry: false,
      canReplace: false,
      tooltip: RETRY_REPLACE_TOOLTIPS.TOO_MANY,
      reason: 'UNRECOGNIZED',
      items,
    });
  }

  const actionKeys = [...new Set(items.map((item) => item.actionKey))];

  // Final output — never retry/replace.
  if (actionKeys.includes('prongPlaced')) {
    return buildResult({
      isValid: false,
      canRetry: false,
      canReplace: false,
      tooltip: RETRY_REPLACE_TOOLTIPS.FINAL,
      reason: 'FINAL',
      stageTitle: PIPELINE_STAGE_ACTIONS.prongPlaced.title,
      actionKey: 'prongPlaced',
      selectionMode: SELECTION_MODE.NONE,
      items,
    });
  }

  // Input / Reoriented — early stages.
  const earlyKeys = ['input', 'reoriented'];
  if (actionKeys.every((key) => earlyKeys.includes(key))) {
    return buildResult({
      isValid: false,
      canRetry: false,
      canReplace: false,
      tooltip: RETRY_REPLACE_TOOLTIPS.EARLY_STAGE,
      reason: 'EARLY_STAGE',
      stageTitle: items[0]?.stageTitle ?? null,
      actionKey: actionKeys[0],
      selectionMode: SELECTION_MODE.NONE,
      items,
    });
  }

  if (actionKeys.some((key) => earlyKeys.includes(key))) {
    return buildResult({
      isValid: false,
      canRetry: false,
      canReplace: false,
      tooltip: RETRY_REPLACE_TOOLTIPS.MIXED_STAGES,
      reason: 'MIXED_STAGES',
      items,
    });
  }

  // Mixed action keys (e.g. Clean + Hollow, or jaw + attachment).
  if (actionKeys.length > 1) {
    return buildResult({
      isValid: false,
      canRetry: false,
      canReplace: false,
      tooltip: RETRY_REPLACE_TOOLTIPS.MIXED_STAGES,
      reason: 'MIXED_STAGES',
      items,
    });
  }

  const actionKey = actionKeys[0];
  const action = PIPELINE_STAGE_ACTIONS[actionKey];

  if (action.selection === SELECTION_MODE.NONE) {
    return buildResult({
      isValid: false,
      canRetry: false,
      canReplace: false,
      tooltip: RETRY_REPLACE_TOOLTIPS.EARLY_STAGE,
      reason: 'UNSUPPORTED',
      stageTitle: action.title,
      actionKey,
      selectionMode: action.selection,
      items,
    });
  }

  if (action.selection === SELECTION_MODE.SINGLE) {
    if (items.length !== 1) {
      return buildResult({
        isValid: false,
        canRetry: false,
        canReplace: false,
        tooltip: RETRY_REPLACE_TOOLTIPS.MULTIPLE_ATTACHMENTS,
        reason: 'MULTIPLE_ATTACHMENTS',
        stageTitle: action.title,
        actionKey,
        selectionMode: action.selection,
        items,
      });
    }

    const allowed = Boolean(action.retry || action.replace);
    return buildResult({
      isValid: allowed,
      canRetry: Boolean(action.retry),
      canReplace: Boolean(action.replace),
      tooltip: allowed ? null : RETRY_REPLACE_TOOLTIPS.TOO_MANY,
      reason: allowed ? 'VALID' : 'UNSUPPORTED',
      stageTitle: action.title,
      resumeStep: action.resumeStep,
      actionKey,
      selectionMode: action.selection,
      items,
    });
  }

  // Jaw mode: 1–2 files, same stage, only maxilla/mandible.
  if (action.selection === SELECTION_MODE.JAW) {
    const jaws = items.map((item) => item.parsed.jaw).filter(Boolean);
    if (jaws.length !== items.length) {
      return buildResult({
        isValid: false,
        canRetry: false,
        canReplace: false,
        tooltip: RETRY_REPLACE_TOOLTIPS.TOO_MANY,
        reason: 'INVALID_JAW',
        stageTitle: action.title,
        actionKey,
        selectionMode: action.selection,
        items,
      });
    }

    if (new Set(jaws).size !== jaws.length) {
      // Two maxillas, etc.
      return buildResult({
        isValid: false,
        canRetry: false,
        canReplace: false,
        tooltip: RETRY_REPLACE_TOOLTIPS.TOO_MANY,
        reason: 'DUPLICATE_JAW',
        stageTitle: action.title,
        actionKey,
        selectionMode: action.selection,
        items,
      });
    }

    const allowed = Boolean(action.retry || action.replace);
    return buildResult({
      isValid: allowed,
      canRetry: Boolean(action.retry),
      canReplace: Boolean(action.replace),
      tooltip: allowed ? null : RETRY_REPLACE_TOOLTIPS.TOO_MANY,
      reason: allowed ? 'VALID' : 'UNSUPPORTED',
      stageTitle: action.title,
      resumeStep: action.resumeStep,
      actionKey,
      selectionMode: action.selection,
      items,
    });
  }

  return buildResult({
    isValid: false,
    canRetry: false,
    canReplace: false,
    tooltip: RETRY_REPLACE_TOOLTIPS.TOO_MANY,
    reason: 'UNKNOWN',
    items,
  });
};

/** True when Retry and/or Replace may be enabled for this selection. */
export const isRetryReplaceAllowed = (selectedFiles, options) =>
  evaluateRetryReplaceSelection(selectedFiles, options).isValid;

/** Tooltip shown when Retry/Replace are disabled; null when enabled. */
export const getRetryReplaceTooltip = (selectedFiles, options) =>
  evaluateRetryReplaceSelection(selectedFiles, options).tooltip;

/**
 * Stage info for a valid Retry selection (Phase R2 will use resumeStep).
 * Returns null when the selection is not retryable.
 */
export const getResumeStage = (selectedFiles, options) => {
  const result = evaluateRetryReplaceSelection(selectedFiles, options);
  if (!result.canRetry) return null;

  return {
    actionKey: result.actionKey,
    stageTitle: result.stageTitle,
    resumeStep: result.resumeStep,
    selectionMode: result.selectionMode,
  };
};
