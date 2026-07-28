import { describe, expect, it } from 'vitest';
import { DISPLAY_CHECKPOINTS, getDisplayCheckpoint } from '../displayProgress';
import { LOADING_MILESTONES } from '../constants';
import { RUN_STATUS } from '../runLifecycle';

describe('DISPLAY_CHECKPOINTS', () => {
  it('defines floor, ceiling, and softCeiling for every band', () => {
    Object.values(DISPLAY_CHECKPOINTS).forEach((band) => {
      expect(band).toMatchObject({
        id: expect.any(String),
        floor: expect.any(Number),
        ceiling: expect.any(Number),
        softCeiling: expect.any(Number),
      });
      expect(band.softCeiling).toBeLessThanOrEqual(band.ceiling);
      expect(band.floor).toBeLessThanOrEqual(band.softCeiling);
    });
  });
});

describe('getDisplayCheckpoint', () => {
  it('maps POST accepted (has runId, no step) to 0–15', () => {
    expect(
      getDisplayCheckpoint({ hasRunId: true, status: null, currentStep: null })
    ).toEqual(DISPLAY_CHECKPOINTS.ACCEPTED);
  });

  it('maps PRE to 15–35', () => {
    expect(
      getDisplayCheckpoint({
        hasRunId: true,
        status: RUN_STATUS.RUNNING,
        currentStep: 'PRE',
      })
    ).toEqual(DISPLAY_CHECKPOINTS.PRE);
  });

  it('maps step 0 to 35–60', () => {
    expect(
      getDisplayCheckpoint({
        hasRunId: true,
        status: RUN_STATUS.RUNNING,
        currentStep: 0,
      })
    ).toEqual(DISPLAY_CHECKPOINTS.STEP_0);
  });

  it('maps step 1+ to 60–65', () => {
    expect(
      getDisplayCheckpoint({
        hasRunId: true,
        status: RUN_STATUS.RUNNING,
        currentStep: 1,
      })
    ).toEqual(DISPLAY_CHECKPOINTS.STEP_1_PLUS);
    expect(
      getDisplayCheckpoint({
        hasRunId: true,
        status: RUN_STATUS.RUNNING,
        currentStep: 2,
      })
    ).toEqual(DISPLAY_CHECKPOINTS.STEP_1_PLUS);
  });

  it('maps filesReady to 65–85 and opening milestone to 85–100', () => {
    expect(
      getDisplayCheckpoint({
        hasRunId: true,
        filesReady: true,
        milestoneId: LOADING_MILESTONES.FILES_READY.id,
      })
    ).toEqual(DISPLAY_CHECKPOINTS.FILES_READY);

    expect(
      getDisplayCheckpoint({
        hasRunId: true,
        filesReady: true,
        milestoneId: LOADING_MILESTONES.OPENING.id,
      })
    ).toEqual(DISPLAY_CHECKPOINTS.OPENING);
  });

  it('keeps DONE / done status in 60–65 until filesReady', () => {
    expect(
      getDisplayCheckpoint({
        hasRunId: true,
        status: RUN_STATUS.DONE,
        currentStep: 'DONE',
        filesReady: false,
      })
    ).toEqual(DISPLAY_CHECKPOINTS.STEP_1_PLUS);
  });
});
