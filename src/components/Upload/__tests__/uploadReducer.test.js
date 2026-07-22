import { describe, expect, it } from 'vitest';
import { ACTION, PHASE, SCAN_SLOT } from '../state/uploadConstants';
import { uploadInitialState } from '../state/uploadInitialState';
import { uploadReducer } from '../state/uploadReducer';

const file = (name) => ({ name, size: 10 });

describe('uploadReducer', () => {
  it('enters reviewing when the second scan is accepted', () => {
    const withMaxilla = uploadReducer(uploadInitialState, {
      type: ACTION.SCAN_ACCEPTED,
      payload: { slot: SCAN_SLOT.MAXILLA, file: file('max.stl') },
    });

    expect(withMaxilla.phase).toBe(PHASE.COLLECTING);

    const reviewing = uploadReducer(withMaxilla, {
      type: ACTION.SCAN_ACCEPTED,
      payload: { slot: SCAN_SLOT.MANDIBLE, file: file('mand.stl') },
    });

    expect(reviewing.phase).toBe(PHASE.REVIEWING);
    expect(reviewing.scans[SCAN_SLOT.MAXILLA].name).toBe('max.stl');
    expect(reviewing.scans[SCAN_SLOT.MANDIBLE].name).toBe('mand.stl');
  });

  it('resets to collecting when both scans are cleared', () => {
    const reviewing = {
      ...uploadInitialState,
      phase: PHASE.REVIEWING,
      scans: {
        [SCAN_SLOT.MAXILLA]: file('max.stl'),
        [SCAN_SLOT.MANDIBLE]: file('mand.stl'),
      },
      patientId: 'P-1',
      stentraType: 'lat_left',
    };

    const afterOne = uploadReducer(reviewing, {
      type: ACTION.SCAN_CLEARED,
      payload: { slot: SCAN_SLOT.MAXILLA },
    });
    expect(afterOne.phase).toBe(PHASE.REVIEWING);
    expect(afterOne.selectedPreview).toBe(SCAN_SLOT.MANDIBLE);

    const afterBoth = uploadReducer(afterOne, {
      type: ACTION.SCAN_CLEARED,
      payload: { slot: SCAN_SLOT.MANDIBLE },
    });
    expect(afterBoth).toEqual(uploadInitialState);
  });

  it('toggles stentra type and updates patient id', () => {
    const withType = uploadReducer(uploadInitialState, {
      type: ACTION.STENTRA_TYPE_TOGGLED,
      payload: { value: 'elevate' },
    });
    expect(withType.stentraType).toBe('elevate');

    const cleared = uploadReducer(withType, {
      type: ACTION.STENTRA_TYPE_TOGGLED,
      payload: { value: 'elevate' },
    });
    expect(cleared.stentraType).toBe('');

    const withPatient = uploadReducer(cleared, {
      type: ACTION.PATIENT_ID_CHANGED,
      payload: { value: 'ABC' },
    });
    expect(withPatient.patientId).toBe('ABC');
  });

  it('moves through submit success and failure without losing scans', () => {
    const reviewing = {
      ...uploadInitialState,
      phase: PHASE.REVIEWING,
      scans: {
        [SCAN_SLOT.MAXILLA]: file('max.stl'),
        [SCAN_SLOT.MANDIBLE]: file('mand.stl'),
      },
      patientId: 'P-1',
      stentraType: 'lat_left',
    };

    const submitting = uploadReducer(reviewing, {
      type: ACTION.SUBMIT_STARTED,
    });
    expect(submitting.phase).toBe(PHASE.SUBMITTING);

    const succeeded = uploadReducer(submitting, {
      type: ACTION.SUBMIT_SUCCEEDED,
    });
    expect(succeeded.phase).toBe(PHASE.REVIEWING);
    expect(succeeded.scans[SCAN_SLOT.MAXILLA].name).toBe('max.stl');

    const failed = uploadReducer(submitting, {
      type: ACTION.SUBMIT_FAILED,
      payload: { message: 'Backend down' },
    });
    expect(failed.phase).toBe(PHASE.REVIEWING);
    expect(failed.error).toBe('Backend down');
  });

  it('WORKFLOW_RESET restores the initial collecting state', () => {
    const dirty = {
      ...uploadInitialState,
      phase: PHASE.REVIEWING,
      patientId: 'X',
      stentraType: 'depress',
      scans: {
        [SCAN_SLOT.MAXILLA]: file('max.stl'),
        [SCAN_SLOT.MANDIBLE]: file('mand.stl'),
      },
    };

    expect(uploadReducer(dirty, { type: ACTION.WORKFLOW_RESET })).toEqual(
      uploadInitialState
    );
  });
});
