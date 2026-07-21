import { useRef, useCallback, useMemo } from 'react';
import { validateFile } from '../utils';
import { ACTION, PHASE, SCAN_SLOT } from '../state/uploadConstants';
import { createRun } from '../../../api/runs';
import {
  selectBothScansReady,
  selectCanConfirm,
  selectConfirmDisabledReason,
  selectActivePreviewFile,
  selectMaxilla,
  selectMandible,
} from '../state/uploadSelectors';

/**
 * Upload workflow orchestration: validation + refs + confirm side effect.
 *
 * State is owned by the caller (App) — single source of truth for the draft
 * across Upload ↔ Result Viewer navigation.
 *
 * @param {object} options
 * @param {object} options.state - uploadReducer state
 * @param {Function} options.dispatch - uploadReducer dispatch
 * @param {Function} options.onConfirm - called after createRun succeeds
 */
const useUploadWorkflow = ({ state, dispatch, onConfirm }) => {
  const maxillaInputRef = useRef(null);
  const mandibleInputRef = useRef(null);

  const acceptScan = useCallback((file, slot) => {
    if (!file) return;
    const validationError = validateFile(file);
    if (validationError) {
      dispatch({
        type: ACTION.SCAN_REJECTED,
        payload: { message: validationError, slot },
      });
      return;
    }
    dispatch({
      type: ACTION.SCAN_ACCEPTED,
      payload: { slot, file },
    });
  }, [dispatch]);

  const handleMaxillaFile = useCallback(
    (file) => acceptScan(file, SCAN_SLOT.MAXILLA),
    [acceptScan]
  );

  const handleMandibleFile = useCallback(
    (file) => acceptScan(file, SCAN_SLOT.MANDIBLE),
    [acceptScan]
  );

  /** Multi-file drop: first → maxilla, second → mandible (legacy order). */
  const handleFiles = useCallback(
    (files) => {
      if (!files || files.length === 0) return;

      if (files.length > 2) {
        dispatch({
          type: ACTION.ERROR_SET,
          payload: {
            message:
              'Please select only two STL files: one Mandible scan and one Maxilla scan.',
          },
        });
        return;
      }

      const list = Array.from(files);
      if (list[0]) acceptScan(list[0], SCAN_SLOT.MAXILLA);
      if (list[1]) acceptScan(list[1], SCAN_SLOT.MANDIBLE);
    },
    [acceptScan, dispatch]
  );

  const clearScan = useCallback((slot) => {
    dispatch({ type: ACTION.SCAN_CLEARED, payload: { slot } });
  }, [dispatch]);

  const resetWorkflow = useCallback(() => {
    dispatch({ type: ACTION.WORKFLOW_RESET });
  }, [dispatch]);

  const setPatientId = useCallback((value) => {
    dispatch({
      type: ACTION.PATIENT_ID_CHANGED,
      payload: { value },
    });
  }, [dispatch]);

  const toggleStentraType = useCallback((value) => {
    dispatch({
      type: ACTION.STENTRA_TYPE_TOGGLED,
      payload: { value },
    });
  }, [dispatch]);

  const selectPreview = useCallback((slot) => {
    dispatch({ type: ACTION.PREVIEW_SELECTED, payload: { slot } });
  }, [dispatch]);

  const handleConfirm = useCallback(async () => {
    if (!selectCanConfirm(state)) return;
    if (typeof onConfirm !== 'function') return;

    try {
      dispatch({
        type: ACTION.SUBMIT_STARTED,
      });
      const payload = {
        maxilla: state.scans[SCAN_SLOT.MAXILLA],
        mandible: state.scans[SCAN_SLOT.MANDIBLE],
        patientId: state.patientId.trim(),
        stentraType: state.stentraType,
      };

      const run = await createRun(payload);

      dispatch({
        type: ACTION.SUBMIT_SUCCEEDED,
      });
      // Preserve ResultViewer contract (scan1/scan2/shieldOption) + patientId.
      onConfirm({
        shieldOption: state.stentraType,
        scan1: state.scans[SCAN_SLOT.MAXILLA],
        scan2: state.scans[SCAN_SLOT.MANDIBLE],
        patientId: state.patientId.trim(),
        maxilla: state.scans[SCAN_SLOT.MAXILLA],
        mandible: state.scans[SCAN_SLOT.MANDIBLE],
        stentraType: state.stentraType,
        runId: run.run_id,
        statusUrl: run.status_url,
      });
    } catch (error) {
      dispatch({
        type: ACTION.SUBMIT_FAILED,
        payload: {
          message:
            error instanceof Error
              ? error.message
              : 'Failed to create run.',
        },
      });
    }
  }, [state, onConfirm, dispatch]);

  const derived = useMemo(
    () => ({
      maxillaFile: selectMaxilla(state),
      mandibleFile: selectMandible(state),
      bothScansReady: selectBothScansReady(state),
      canConfirm: selectCanConfirm(state),
      confirmDisabledReason: selectConfirmDisabledReason(state),
      activePreviewFile: selectActivePreviewFile(state),
      isCollecting: state.phase === PHASE.COLLECTING,
      isReviewing: state.phase === PHASE.REVIEWING,
    }),
    [state]
  );

  return {
    // State
    phase: state.phase,
    patientId: state.patientId,
    stentraType: state.stentraType,
    selectedPreview: state.selectedPreview,
    error: state.error,
    ...derived,

    // Refs (DOM only)
    maxillaInputRef,
    mandibleInputRef,

    // Actions
    handleMaxillaFile,
    handleMandibleFile,
    handleFiles,
    clearScan,
    resetWorkflow,
    setPatientId,
    toggleStentraType,
    selectPreview,
    handleConfirm,

    // Slot constants for UI
    SCAN_SLOT,
  };
};

export default useUploadWorkflow;
