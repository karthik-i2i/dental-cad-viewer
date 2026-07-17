import { PHASE, SCAN_SLOT } from './uploadConstants';

export const selectMaxilla = (state) => state.scans[SCAN_SLOT.MAXILLA];
export const selectMandible = (state) => state.scans[SCAN_SLOT.MANDIBLE];

export const selectBothScansReady = (state) =>
  Boolean(selectMaxilla(state) && selectMandible(state));

export const selectCanConfirm = (state) =>
  state.phase === PHASE.REVIEWING &&
  selectBothScansReady(state) &&
  Boolean(state.patientId.trim()) &&
  Boolean(state.stentraType);

/**
 * Highest-priority reason Confirm is disabled.
 * Priority: Maxilla → Mandible → Patient ID → Stentra Type
 */
export const selectConfirmDisabledReason = (state) => {
  if (state.phase !== PHASE.REVIEWING) {
    return 'Please upload both Maxilla and Mandible scans.';
  }
  if (!selectMaxilla(state)) {
    return 'Please upload the Maxilla scan.';
  }
  if (!selectMandible(state)) {
    return 'Please upload the Mandible scan.';
  }
  if (!state.patientId.trim()) {
    return 'Please enter the Patient ID.';
  }
  if (!state.stentraType) {
    return 'Please select a Stentra Type.';
  }
  return null;
};

export const selectActivePreviewFile = (state) => {
  const preferred = state.scans[state.selectedPreview];
  if (preferred) return preferred;
  return selectMaxilla(state) || selectMandible(state) || null;
};

export const selectIsSubmitting = (state) =>
  state.phase === PHASE.SUBMITTING;
