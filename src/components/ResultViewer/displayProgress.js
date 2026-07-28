import { RUN_STATUS } from './runLifecycle';
import { LOADING_MILESTONES } from './constants';

/**
 * Display-only checkpoint bands for the loading bar soft-fill.
 *
 * - floor: earliest truthful % when entering this checkpoint (eased, not snapped)
 * - ceiling: hard band end (documentation / clamp upper bound)
 * - softCeiling: ease target (must be <= ceiling); bar approaches this and waits
 *
 * Backend / useRunLoadingState still own reveal; animation never advances
 * into the next checkpoint until truth inputs change.
 *
 * Tune softCeiling / floor / ceiling here without touching the hook.
 */
export const DISPLAY_CHECKPOINTS = {
  ACCEPTED: { id: 'accepted', floor: 0, ceiling: 15, softCeiling: 15 },
  PRE: { id: 'pre', floor: 15, ceiling: 35, softCeiling: 35 },
  STEP_0: { id: 'step_0', floor: 35, ceiling: 60, softCeiling: 60 },
  STEP_1_PLUS: { id: 'step_1_plus', floor: 60, ceiling: 65, softCeiling: 65 },
  FILES_READY: { id: 'files_ready', floor: 65, ceiling: 85, softCeiling: 85 },
  OPENING: { id: 'opening', floor: 85, ceiling: 100, softCeiling: 100 },
};

/**
 * Maps loading truth signals → display checkpoint
 * { id, floor, ceiling, softCeiling }.
 *
 * @param {{
 *   hasRunId?: boolean,
 *   status?: string|null,
 *   currentStep?: string|number|null,
 *   filesReady?: boolean,
 *   milestoneId?: string|null,
 * }} [input]
 */
export const getDisplayCheckpoint = ({
  hasRunId = false,
  status = null,
  currentStep = null,
  filesReady = false,
  milestoneId = null,
} = {}) => {
  if (filesReady && milestoneId === LOADING_MILESTONES.OPENING.id) {
    return DISPLAY_CHECKPOINTS.OPENING;
  }

  if (filesReady) {
    return DISPLAY_CHECKPOINTS.FILES_READY;
  }

  const stepToken =
    typeof currentStep === 'string' ? currentStep.toUpperCase() : null;

  if (stepToken === 'PRE') {
    return DISPLAY_CHECKPOINTS.PRE;
  }

  // Terminal / DONE: still waiting on local Input+Reoriented downloads.
  if (status === RUN_STATUS.DONE || stepToken === 'DONE') {
    return DISPLAY_CHECKPOINTS.STEP_1_PLUS;
  }

  if (currentStep !== null && currentStep !== undefined && stepToken !== 'PRE') {
    const stepNum = Number(currentStep);
    if (!Number.isNaN(stepNum)) {
      if (stepNum >= 1) {
        return DISPLAY_CHECKPOINTS.STEP_1_PLUS;
      }
      if (stepNum === 0) {
        return DISPLAY_CHECKPOINTS.STEP_0;
      }
    }
  }

  if (hasRunId) {
    return DISPLAY_CHECKPOINTS.ACCEPTED;
  }

  return DISPLAY_CHECKPOINTS.ACCEPTED;
};
