import { PHASE, SCAN_SLOT } from './uploadConstants';

export const uploadInitialState = {
  phase: PHASE.COLLECTING,
  scans: {
    [SCAN_SLOT.MAXILLA]: null,
    [SCAN_SLOT.MANDIBLE]: null,
  },
  patientId: '',
  stentraType: '',
  selectedPreview: SCAN_SLOT.MAXILLA,
  error: null,
};
