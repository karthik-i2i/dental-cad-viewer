import { describe, expect, it } from 'vitest';
import { PHASE, SCAN_SLOT } from '../state/uploadConstants';
import { uploadInitialState } from '../state/uploadInitialState';
import {
  selectActivePreviewFile,
  selectBothScansReady,
  selectCanConfirm,
  selectConfirmDisabledReason,
  selectIsSubmitting,
} from '../state/uploadSelectors';

const file = (name) => ({ name, size: 10 });

const reviewingBoth = {
  ...uploadInitialState,
  phase: PHASE.REVIEWING,
  scans: {
    [SCAN_SLOT.MAXILLA]: file('max.stl'),
    [SCAN_SLOT.MANDIBLE]: file('mand.stl'),
  },
  patientId: 'P-100',
  stentraType: 'lat_left',
  selectedPreview: SCAN_SLOT.MAXILLA,
};

describe('uploadSelectors', () => {
  it('reports both scans ready only when maxilla and mandible exist', () => {
    expect(selectBothScansReady(uploadInitialState)).toBe(false);
    expect(selectBothScansReady(reviewingBoth)).toBe(true);
  });

  it('allows confirm only in reviewing with scans, patient id, and stentra type', () => {
    expect(selectCanConfirm(reviewingBoth)).toBe(true);
    expect(
      selectCanConfirm({ ...reviewingBoth, patientId: '   ' })
    ).toBe(false);
    expect(
      selectCanConfirm({ ...reviewingBoth, stentraType: '' })
    ).toBe(false);
    expect(
      selectCanConfirm({ ...reviewingBoth, phase: PHASE.COLLECTING })
    ).toBe(false);
  });

  it('returns disabled reasons in priority order', () => {
    expect(selectConfirmDisabledReason(uploadInitialState)).toBe(
      'Please upload both Maxilla and Mandible scans.'
    );

    expect(
      selectConfirmDisabledReason({
        ...reviewingBoth,
        scans: {
          [SCAN_SLOT.MAXILLA]: null,
          [SCAN_SLOT.MANDIBLE]: file('mand.stl'),
        },
      })
    ).toBe('Please upload the Maxilla scan.');

    expect(
      selectConfirmDisabledReason({
        ...reviewingBoth,
        scans: {
          [SCAN_SLOT.MAXILLA]: file('max.stl'),
          [SCAN_SLOT.MANDIBLE]: null,
        },
      })
    ).toBe('Please upload the Mandible scan.');

    expect(
      selectConfirmDisabledReason({
        ...reviewingBoth,
        patientId: '',
      })
    ).toBe('Please enter the Patient ID.');

    expect(
      selectConfirmDisabledReason({
        ...reviewingBoth,
        stentraType: '',
      })
    ).toBe('Please select a Stentra Type.');

    expect(selectConfirmDisabledReason(reviewingBoth)).toBeNull();
  });

  it('resolves the active preview file with fallbacks', () => {
    expect(selectActivePreviewFile(reviewingBoth).name).toBe('max.stl');

    expect(
      selectActivePreviewFile({
        ...reviewingBoth,
        selectedPreview: SCAN_SLOT.MANDIBLE,
      }).name
    ).toBe('mand.stl');

    expect(
      selectActivePreviewFile({
        ...reviewingBoth,
        scans: {
          [SCAN_SLOT.MAXILLA]: null,
          [SCAN_SLOT.MANDIBLE]: file('mand.stl'),
        },
        selectedPreview: SCAN_SLOT.MAXILLA,
      }).name
    ).toBe('mand.stl');
  });

  it('detects submitting phase', () => {
    expect(selectIsSubmitting(reviewingBoth)).toBe(false);
    expect(
      selectIsSubmitting({ ...reviewingBoth, phase: PHASE.SUBMITTING })
    ).toBe(true);
  });
});
