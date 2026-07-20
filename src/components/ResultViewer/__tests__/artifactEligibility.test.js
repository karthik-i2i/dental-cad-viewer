import { PIPELINE_STAGES } from '../constants';
import { RUN_STATUS } from '../runLifecycle';
import {
  getArtifactProgressStep,
  isArtifactEligible,
  isStageEligible,
} from '../utils';

const FILES = {
  inputMaxilla: 'run_step_00_input_maxilla.ply',
  reorientedMandible: 'run_step_01_reoriented_mandible.ply',
  cleanMaxilla: 'run_step_02_clean_maxilla.stl',
  teethRemovedMaxilla: 'run_step_03_teeth_removed_maxilla.ply',
  trimmedMaxilla: 'run_step_04_trimmed_maxilla.stl',
  hollowMaxilla: 'run_step_05_hollow_maxilla.stl',
  solidMaxilla: 'run_step_06_solid_maxilla.stl',
  wall: 'run_step_07_wall.stl',
  wallFillOnly: 'run_step_07_wall_fill_only.stl',
  blade: 'run_step_08_blade.stl',
  prongEngraved: 'run_step_09_prong_engraved.stl',
  prongPlaced: 'run_step_10_prong_placed.stl',
  prongAttached: 'run_step_10_prong_attached.stl',
  unknown: 'notes.txt',
};

describe('getArtifactProgressStep', () => {
  test.each([
    [FILES.inputMaxilla, 0],
    [FILES.reorientedMandible, 1],
    [FILES.cleanMaxilla, 2],
    [FILES.teethRemovedMaxilla, 3],
    [FILES.trimmedMaxilla, 4],
    [FILES.hollowMaxilla, 5],
    [FILES.solidMaxilla, 6],
  ])('maps jaw file %s → progress step %i', (fileName, expected) => {
    // Arrange / Act / Assert
    expect(getArtifactProgressStep(fileName)).toBe(expected);
  });

  test.each([
    [FILES.wall, 7],
    [FILES.wallFillOnly, 7],
    [FILES.blade, 8],
    [FILES.prongEngraved, 9],
  ])('maps attachment %s → progress step %i', (fileName, expected) => {
    expect(getArtifactProgressStep(fileName)).toBe(expected);
  });

  test.each([[FILES.prongPlaced], [FILES.prongAttached]])(
    'maps final file %s → progress step 10',
    (fileName) => {
      expect(getArtifactProgressStep(fileName)).toBe(10);
    }
  );

  test('maps unknown attachment-like names (incl. legacy step_08) to step 7', () => {
    // Arrange — parser classifies these as attachments; only Blade/Prong Engraved remap
    // Act / Assert
    expect(getArtifactProgressStep('run_step_08_legacy_piece.stl')).toBe(7);
    expect(getArtifactProgressStep(FILES.unknown)).toBe(7);
    expect(getArtifactProgressStep('')).toBe(7);
  });
});

describe('isArtifactEligible', () => {
  describe('terminal completion short-circuit', () => {
    test('allows any artifact when status is done', () => {
      // Arrange / Act / Assert
      expect(
        isArtifactEligible(FILES.prongPlaced, {
          status: RUN_STATUS.DONE,
          currentStep: 2,
        })
      ).toBe(true);
      expect(
        isArtifactEligible(FILES.unknown, {
          status: RUN_STATUS.DONE,
          currentStep: null,
        })
      ).toBe(true);
    });

    test.each([['DONE'], ['done'], ['Done']])(
      'allows any artifact when currentStep is "%s"',
      (currentStep) => {
        expect(
          isArtifactEligible(FILES.prongPlaced, {
            status: RUN_STATUS.RUNNING,
            currentStep,
          })
        ).toBe(true);
      }
    );
  });

  describe('missing / invalid currentStep', () => {
    test('rejects when currentStep is null or undefined (and not done)', () => {
      expect(
        isArtifactEligible(FILES.cleanMaxilla, {
          status: RUN_STATUS.RUNNING,
          currentStep: null,
        })
      ).toBe(false);
      expect(
        isArtifactEligible(FILES.cleanMaxilla, {
          status: RUN_STATUS.RUNNING,
        })
      ).toBe(false);
    });

    test('rejects when currentStep is not numeric', () => {
      expect(
        isArtifactEligible(FILES.cleanMaxilla, {
          status: RUN_STATUS.RUNNING,
          currentStep: 'PRE',
        })
      ).toBe(false);
      expect(
        isArtifactEligible(FILES.cleanMaxilla, {
          status: RUN_STATUS.RUNNING,
          currentStep: NaN,
        })
      ).toBe(false);
    });
  });

  describe('running pipeline: progressStep < currentStep', () => {
    test.each([
      // [file, currentStep, expected]
      [FILES.inputMaxilla, 0, false], // executing Input — not ready
      [FILES.inputMaxilla, 1, true], // Reoriented executing — Input ready
      [FILES.cleanMaxilla, 2, false],
      [FILES.cleanMaxilla, 3, true],
      [FILES.solidMaxilla, 6, false],
      [FILES.solidMaxilla, 7, true],
      [FILES.wall, 7, false],
      [FILES.wall, 8, true],
      [FILES.wallFillOnly, 7, false],
      [FILES.wallFillOnly, 8, true],
      [FILES.blade, 8, false],
      [FILES.blade, 9, true],
      [FILES.prongEngraved, 9, false],
      [FILES.prongEngraved, 10, true],
      [FILES.prongPlaced, 10, false], // final only via terminal short-circuit
      [FILES.prongPlaced, 11, true], // defensive: numeric beyond final
    ])(
      '%s at currentStep %p → %p',
      (fileName, currentStep, expected) => {
        // Arrange / Act
        const result = isArtifactEligible(fileName, {
          status: RUN_STATUS.RUNNING,
          currentStep,
        });

        // Assert
        expect(result).toBe(expected);
      }
    );

    test('coerces string numeric currentStep', () => {
      expect(
        isArtifactEligible(FILES.cleanMaxilla, {
          status: RUN_STATUS.RUNNING,
          currentStep: '3',
        })
      ).toBe(true);
    });

    test('treats unrecognized filenames as attachment step 7 while running', () => {
      expect(
        isArtifactEligible(FILES.unknown, {
          status: RUN_STATUS.RUNNING,
          currentStep: 7,
        })
      ).toBe(false);
      expect(
        isArtifactEligible(FILES.unknown, {
          status: RUN_STATUS.RUNNING,
          currentStep: 8,
        })
      ).toBe(true);
    });
  });

  describe('resume options (accepted, no behavioral change)', () => {
    test('resumeSessionActive / resumeStep do not loosen the strict < rule', () => {
      // Arrange — Clean is currently executing (step 2)
      const opts = {
        status: RUN_STATUS.RUNNING,
        currentStep: 2,
        resumeSessionActive: true,
        resumeStep: 2,
      };

      // Act / Assert
      expect(isArtifactEligible(FILES.cleanMaxilla, opts)).toBe(false);
      expect(isArtifactEligible(FILES.reorientedMandible, opts)).toBe(true);
    });
  });
});

describe('isStageEligible', () => {
  describe('terminal completion short-circuit', () => {
    test('allows every stage group when status is done', () => {
      const opts = { status: RUN_STATUS.DONE, currentStep: 0 };

      expect(isStageEligible(PIPELINE_STAGES.INPUT.id, opts)).toBe(true);
      expect(isStageEligible(PIPELINE_STAGES.ATTACHMENTS.id, opts)).toBe(true);
      expect(isStageEligible(PIPELINE_STAGES.FINAL.id, opts)).toBe(true);
    });

    test.each([['DONE'], ['done']])(
      'allows every stage group when currentStep is "%s"',
      (currentStep) => {
        const opts = { status: RUN_STATUS.RUNNING, currentStep };

        expect(isStageEligible(PIPELINE_STAGES.FINAL.id, opts)).toBe(true);
        expect(isStageEligible(PIPELINE_STAGES.CLEAN.id, opts)).toBe(true);
      }
    );
  });

  describe('missing / invalid currentStep', () => {
    test('rejects when currentStep is missing', () => {
      expect(
        isStageEligible(PIPELINE_STAGES.INPUT.id, {
          status: RUN_STATUS.RUNNING,
          currentStep: null,
        })
      ).toBe(false);
    });

    test('rejects non-numeric currentStep', () => {
      expect(
        isStageEligible(PIPELINE_STAGES.INPUT.id, {
          status: RUN_STATUS.RUNNING,
          currentStep: 'PRE',
        })
      ).toBe(false);
    });
  });

  describe('jaw stage groups: stageId <= currentStep', () => {
    test.each([
      [PIPELINE_STAGES.INPUT.id, 0, true],
      [PIPELINE_STAGES.INPUT.id, 1, true],
      [PIPELINE_STAGES.CLEAN.id, 1, false],
      [PIPELINE_STAGES.CLEAN.id, 2, true],
      [PIPELINE_STAGES.SOLID.id, 5, false],
      [PIPELINE_STAGES.SOLID.id, 6, true],
      [PIPELINE_STAGES.SOLID.id, 7, true],
    ])(
      'stageId %i at currentStep %p → %p',
      (stageId, currentStep, expected) => {
        expect(
          isStageEligible(stageId, {
            status: RUN_STATUS.RUNNING,
            currentStep,
          })
        ).toBe(expected);
      }
    );
  });

  describe('attachments and final group thresholds', () => {
    test.each([
      // Attachments group (id 7): visible when currentStep >= 7
      [PIPELINE_STAGES.ATTACHMENTS.id, 6, false],
      [PIPELINE_STAGES.ATTACHMENTS.id, 7, true],
      [PIPELINE_STAGES.ATTACHMENTS.id, 9, true],
      [PIPELINE_STAGES.ATTACHMENTS.id, 10, true],
      // Final group (id 8): visible when currentStep >= 10
      [PIPELINE_STAGES.FINAL.id, 9, false],
      [PIPELINE_STAGES.FINAL.id, 10, true],
      [PIPELINE_STAGES.FINAL.id, 11, true],
    ])(
      'stageId %i at currentStep %p → %p',
      (stageId, currentStep, expected) => {
        expect(
          isStageEligible(stageId, {
            status: RUN_STATUS.RUNNING,
            currentStep,
          })
        ).toBe(expected);
      }
    );
  });

  describe('contrast with artifact download gating', () => {
    test('stage can be eligible while its currently-executing artifact is not', () => {
      // Arrange — Clean stage container visible (2 <= 2), but Clean file not downloadable (2 < 2 is false)
      const opts = { status: RUN_STATUS.RUNNING, currentStep: 2 };

      // Act / Assert
      expect(isStageEligible(PIPELINE_STAGES.CLEAN.id, opts)).toBe(true);
      expect(isArtifactEligible(FILES.cleanMaxilla, opts)).toBe(false);
    });

    test('Final group appears at step 10 while prong_placed still needs terminal status', () => {
      const opts = { status: RUN_STATUS.RUNNING, currentStep: 10 };

      expect(isStageEligible(PIPELINE_STAGES.FINAL.id, opts)).toBe(true);
      expect(isArtifactEligible(FILES.prongPlaced, opts)).toBe(false);
      expect(
        isArtifactEligible(FILES.prongPlaced, {
          status: RUN_STATUS.DONE,
          currentStep: 10,
        })
      ).toBe(true);
    });
  });

  describe('resume options (accepted, no behavioral change)', () => {
    test('resumeSessionActive does not change stage eligibility', () => {
      const base = { status: RUN_STATUS.RUNNING, currentStep: 2 };

      expect(isStageEligible(PIPELINE_STAGES.CLEAN.id, base)).toBe(true);
      expect(
        isStageEligible(PIPELINE_STAGES.CLEAN.id, {
          ...base,
          resumeSessionActive: true,
        })
      ).toBe(true);
      expect(
        isStageEligible(PIPELINE_STAGES.HOLLOW.id, {
          ...base,
          resumeSessionActive: true,
        })
      ).toBe(false);
    });
  });
});
