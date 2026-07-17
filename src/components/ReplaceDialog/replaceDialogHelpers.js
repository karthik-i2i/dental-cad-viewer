import {
  PIPELINE_STAGE_ACTIONS,
  SELECTION_MODE,
} from '../ResultViewer/constants';
import {
  evaluateRetryReplaceSelection,
  getSelectionMetadata,
} from '../ResultViewer/resumeSelection';

const JAW_LABELS = {
  maxilla: 'Maxilla',
  mandible: 'Mandible',
};

/**
 * Builds Replace dialog configuration from Model Explorer selection.
 * Returns null when the selection is not replaceable.
 */
export const getReplaceDialogConfiguration = (selection = []) => {
  const evaluation = evaluateRetryReplaceSelection(selection);
  if (!evaluation.canReplace) return null;

  const items = evaluation.items?.length
    ? evaluation.items
    : getSelectionMetadata(selection);

  const slots = items.map((item) => {
    if (evaluation.selectionMode === SELECTION_MODE.JAW) {
      const jaw = item.parsed?.jaw;
      return {
        slotKey: jaw,
        kind: 'jaw',
        jaw,
        label: JAW_LABELS[jaw] || item.stageTitle,
      };
    }

    return {
      slotKey: 'attachment',
      kind: 'attachment',
      jaw: null,
      label: item.stageTitle || item.action?.title || 'Attachment',
    };
  });

  const isAttachment = evaluation.selectionMode === SELECTION_MODE.SINGLE;

  return {
    mode: evaluation.selectionMode,
    title: isAttachment ? 'Replace File' : 'Replace Files',
    stageTitle: evaluation.stageTitle,
    subtitle: evaluation.stageTitle,
    helperText: isAttachment
      ? 'Upload a replacement file for the selected attachment.'
      : 'Upload replacement file(s) for the selected stage.',
    actionKey: evaluation.actionKey,
    resumeStep: evaluation.resumeStep,
    selectionMode: evaluation.selectionMode,
    selectedFiles: selection,
    slots,
    action: PIPELINE_STAGE_ACTIONS[evaluation.actionKey] ?? null,
  };
};

/** Slot keys that must each have a File before Replace is enabled. */
export const getRequiredReplacementSlots = (config) => {
  if (!config?.slots?.length) return [];
  return config.slots.map((slot) => slot.slotKey);
};

/**
 * replacementFiles shape:
 * { maxilla?: File|null, mandible?: File|null, attachment?: File|null }
 */
export const isReplaceReady = (config, replacementFiles = {}) => {
  const required = getRequiredReplacementSlots(config);
  if (!required.length) return false;
  return required.every((slotKey) => Boolean(replacementFiles[slotKey]));
};

/**
 * Payload prepared for Phase R3 (Resume API wiring).
 * No networking here — dialog only returns this object via onConfirm.
 */
export const buildReplaceConfirmPayload = (config, replacementFiles = {}) => {
  if (!config) return null;

  const replacements = {};
  getRequiredReplacementSlots(config).forEach((slotKey) => {
    if (replacementFiles[slotKey]) {
      replacements[slotKey] = replacementFiles[slotKey];
    }
  });

  return {
    stageTitle: config.stageTitle,
    actionKey: config.actionKey,
    resumeStep: config.resumeStep,
    selectionMode: config.selectionMode,
    selectedFiles: config.selectedFiles,
    replacementFiles: replacements,
  };
};

export const createEmptyReplacementFiles = () => ({
  maxilla: null,
  mandible: null,
  attachment: null,
});
