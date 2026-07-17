import { ACTION, PHASE, SCAN_SLOT } from './uploadConstants';
import { uploadInitialState } from './uploadInitialState';

const bothScansPresent = (scans) =>
  Boolean(scans[SCAN_SLOT.MAXILLA] && scans[SCAN_SLOT.MANDIBLE]);

const neitherScanPresent = (scans) =>
  !scans[SCAN_SLOT.MAXILLA] && !scans[SCAN_SLOT.MANDIBLE];

/** Prefer the remaining scan when the selected preview slot was cleared. */
const resolvePreviewAfterClear = (scans, clearedSlot, currentPreview) => {
  if (currentPreview !== clearedSlot) {
    return currentPreview;
  }
  if (clearedSlot === SCAN_SLOT.MAXILLA && scans[SCAN_SLOT.MANDIBLE]) {
    return SCAN_SLOT.MANDIBLE;
  }
  if (clearedSlot === SCAN_SLOT.MANDIBLE && scans[SCAN_SLOT.MAXILLA]) {
    return SCAN_SLOT.MAXILLA;
  }
  return SCAN_SLOT.MAXILLA;
};

const resetToCollecting = () => ({
  ...uploadInitialState,
});

export function uploadReducer(state, action) {
  switch (action.type) {
    case ACTION.SCAN_ACCEPTED: {
      const { slot, file } = action.payload;
      if (slot !== SCAN_SLOT.MAXILLA && slot !== SCAN_SLOT.MANDIBLE) {
        return state;
      }

      const scans = {
        ...state.scans,
        [slot]: file,
      };

      const enteredReviewing =
        state.phase === PHASE.COLLECTING && bothScansPresent(scans);

      const selectedPreview = scans[state.selectedPreview]
        ? state.selectedPreview
        : scans[SCAN_SLOT.MAXILLA]
          ? SCAN_SLOT.MAXILLA
          : SCAN_SLOT.MANDIBLE;

      return {
        ...state,
        scans,
        error: null,
        // Replace never leaves reviewing; collect → review only when both exist.
        phase: enteredReviewing ? PHASE.REVIEWING : state.phase,
        selectedPreview,
      };
    }

    case ACTION.SCAN_REJECTED: {
      return {
        ...state,
        error: action.payload?.message || 'Invalid file.',
      };
    }

    case ACTION.SCAN_CLEARED: {
      if (state.phase !== PHASE.REVIEWING) {
        return state;
      }

      const { slot } = action.payload;
      if (slot !== SCAN_SLOT.MAXILLA && slot !== SCAN_SLOT.MANDIBLE) {
        return state;
      }

      const scans = {
        ...state.scans,
        [slot]: null,
      };

      // Both gone → full reset to collecting (same as re-upload policy).
      if (neitherScanPresent(scans)) {
        return resetToCollecting();
      }

      return {
        ...state,
        scans,
        error: null,
        phase: PHASE.REVIEWING,
        selectedPreview: resolvePreviewAfterClear(
          scans,
          slot,
          state.selectedPreview
        ),
      };
    }

    case ACTION.WORKFLOW_RESET: {
      return resetToCollecting();
    }

    case ACTION.PATIENT_ID_CHANGED: {
      return {
        ...state,
        patientId: action.payload.value,
      };
    }

    case ACTION.STENTRA_TYPE_TOGGLED: {
      const { value } = action.payload;
      return {
        ...state,
        stentraType: state.stentraType === value ? '' : value,
      };
    }

    case ACTION.PREVIEW_SELECTED: {
      const { slot } = action.payload;
      if (!state.scans[slot]) {
        return state;
      }
      return {
        ...state,
        selectedPreview: slot,
      };
    }

    case ACTION.ERROR_SET: {
      return {
        ...state,
        error: action.payload?.message || null,
      };
    }

    case ACTION.ERROR_CLEARED: {
      return {
        ...state,
        error: null,
      };
    }

    case ACTION.SUBMIT_STARTED: {
      return {
        ...state,
        phase: PHASE.SUBMITTING,
        error: null,
      };
    }

    case ACTION.SUBMIT_SUCCEEDED: {
      return state;
    }

    case ACTION.SUBMIT_FAILED: {
      return {
        ...state,
        phase: PHASE.REVIEWING,
        error: action.payload?.message || 'Failed to create run.',
      };
    }

    default:
      return state;
  }
}
