import { PIPELINE_STAGES } from '../constants';
import { getRunFileIdentityKey, parseRunFileName } from '../utils';

describe('parseRunFileName', () => {
  describe('jaw stages (step_00–step_06 + maxilla/mandible)', () => {
    test.each([
      ['run_step_00_input_maxilla.ply', 0, 'Input', 'maxilla', 'Maxilla', 0],
      ['run_step_00_input_mandible.ply', 0, 'Input', 'mandible', 'Mandible', 1],
      [
        'run_step_01_reoriented_maxilla.ply',
        1,
        'Reoriented',
        'maxilla',
        'Maxilla',
        0,
      ],
      [
        'run_step_01_reoriented_mandible.ply',
        1,
        'Reoriented',
        'mandible',
        'Mandible',
        1,
      ],
      ['run_step_02_clean_maxilla.stl', 2, 'Clean', 'maxilla', 'Maxilla', 0],
      ['run_step_02_clean_mandible.stl', 2, 'Clean', 'mandible', 'Mandible', 1],
      [
        'run_step_03_teeth_removed_maxilla.ply',
        3,
        'Teeth Removed',
        'maxilla',
        'Maxilla',
        0,
      ],
      [
        'run_step_03_teeth_removed_mandible.ply',
        3,
        'Teeth Removed',
        'mandible',
        'Mandible',
        1,
      ],
      ['run_step_04_trimmed_maxilla.stl', 4, 'Trimmed', 'maxilla', 'Maxilla', 0],
      [
        'run_step_04_trimmed_mandible.stl',
        4,
        'Trimmed',
        'mandible',
        'Mandible',
        1,
      ],
      ['run_step_05_hollow_maxilla.stl', 5, 'Hollow', 'maxilla', 'Maxilla', 0],
      [
        'run_step_05_hollow_mandible.stl',
        5,
        'Hollow',
        'mandible',
        'Mandible',
        1,
      ],
      ['run_step_06_solid_maxilla.stl', 6, 'Solid', 'maxilla', 'Maxilla', 0],
      ['run_step_06_solid_mandible.stl', 6, 'Solid', 'mandible', 'Mandible', 1],
    ])(
      'parses %s as jaw stage',
      (fileName, stepNumber, stageTitle, jaw, label, sortOrder) => {
        // Arrange / Act
        const result = parseRunFileName(fileName);

        // Assert
        expect(result).toEqual({
          stepNumber,
          pipelineStageId: stepNumber,
          jaw,
          stageTitle,
          label,
          sortOrder,
          kind: 'jaw',
        });
      }
    );

    test('is case-insensitive for step and jaw tokens', () => {
      // Arrange / Act
      const result = parseRunFileName('CASE_STEP_02_CLEAN_MAXILLA.STL');

      // Assert
      expect(result).toMatchObject({
        kind: 'jaw',
        stepNumber: 2,
        pipelineStageId: PIPELINE_STAGES.CLEAN.id,
        jaw: 'maxilla',
        stageTitle: 'Clean',
      });
    });

    test('prefers maxilla when both jaw tokens appear', () => {
      // Arrange — pathological but documents current precedence
      const result = parseRunFileName('run_step_02_maxilla_mandible.stl');

      // Assert
      expect(result.jaw).toBe('maxilla');
      expect(result.kind).toBe('jaw');
    });
  });

  describe('final model variants', () => {
    test.each([
      ['run_step_10_prong_placed.stl', 10],
      ['run_step_10_prong_attached.stl', 10],
      ['patient_prong_placed.stl', null],
      ['patient_prong_attached.stl', null],
    ])('parses %s as final / Prong Placed', (fileName, stepNumber) => {
      // Arrange / Act
      const result = parseRunFileName(fileName);

      // Assert
      expect(result).toMatchObject({
        kind: 'final',
        stepNumber,
        jaw: null,
        pipelineStageId: PIPELINE_STAGES.FINAL.id,
        stageTitle: PIPELINE_STAGES.FINAL.title,
        label: 'Prong Placed',
        sortOrder: 0,
      });
    });

    test('treats unknown step_10+ filenames as final with a fallback label', () => {
      // Arrange / Act
      const result = parseRunFileName('run_step_11_custom_output.stl');

      // Assert
      expect(result).toMatchObject({
        kind: 'final',
        stepNumber: 11,
        pipelineStageId: PIPELINE_STAGES.FINAL.id,
        stageTitle: 'Final',
        label: 'Custom Output',
        jaw: null,
      });
    });
  });

  describe('attachment variants', () => {
    test.each([
      ['run_step_07_wall.stl', 'Wall', 0, 7],
      ['run_step_07_wall_fill_only.stl', 'Wall Fill Only', 1, 7],
      ['run_step_08_blade.stl', 'Blade', 2, 8],
      ['run_step_09_prong_engraved.stl', 'Prong Engraved', 3, 9],
      ['artifact_wall.stl', 'Wall', 0, null],
      ['artifact_blade.stl', 'Blade', 2, null],
      ['artifact_prong_engraved.stl', 'Prong Engraved', 3, null],
    ])(
      'parses %s as attachment (%s)',
      (fileName, label, sortOrder, stepNumber) => {
        // Arrange / Act
        const result = parseRunFileName(fileName);

        // Assert
        expect(result).toMatchObject({
          kind: 'attachment',
          stepNumber,
          jaw: null,
          pipelineStageId: PIPELINE_STAGES.ATTACHMENTS.id,
          stageTitle: PIPELINE_STAGES.ATTACHMENTS.title,
          label,
          sortOrder,
        });
      }
    );

    test('matches wall_fill_only before wall (regression)', () => {
      // Arrange / Act
      const fillOnly = parseRunFileName('run_step_07_wall_fill_only.stl');
      const wall = parseRunFileName('run_step_07_wall.stl');

      // Assert
      expect(fillOnly.label).toBe('Wall Fill Only');
      expect(wall.label).toBe('Wall');
      expect(fillOnly.label).not.toBe(wall.label);
    });

    test('uses step_07 hint when attachment tokens are missing', () => {
      // Arrange / Act
      const result = parseRunFileName('run_step_07_mystery_part.stl');

      // Assert
      expect(result).toMatchObject({
        kind: 'attachment',
        stepNumber: 7,
        pipelineStageId: PIPELINE_STAGES.ATTACHMENTS.id,
        label: 'Mystery Part',
        sortOrder: 4,
      });
    });

    test('uses step_08/09 as historical attachment steps without known tokens', () => {
      // Arrange / Act
      const step08 = parseRunFileName('run_step_08_legacy_piece.stl');
      const step09 = parseRunFileName('run_step_09_legacy_piece.stl');

      // Assert
      expect(step08).toMatchObject({
        kind: 'attachment',
        stepNumber: 8,
        pipelineStageId: PIPELINE_STAGES.ATTACHMENTS.id,
        label: 'Legacy Piece',
        sortOrder: 8,
      });
      expect(step09).toMatchObject({
        kind: 'attachment',
        stepNumber: 9,
        pipelineStageId: PIPELINE_STAGES.ATTACHMENTS.id,
        label: 'Legacy Piece',
        sortOrder: 9,
      });
    });
  });

  describe('edge cases and malformed filenames', () => {
    test('defaults empty input to an attachments fallback', () => {
      // Arrange / Act
      const result = parseRunFileName();

      // Assert
      expect(result).toMatchObject({
        kind: 'attachment',
        stepNumber: null,
        jaw: null,
        pipelineStageId: PIPELINE_STAGES.ATTACHMENTS.id,
        stageTitle: 'Attachments',
      });
      expect(typeof result.label).toBe('string');
    });

    test('strips a single file extension before parsing', () => {
      // Arrange / Act
      const result = parseRunFileName('run_step_02_clean_maxilla.STL');

      // Assert
      expect(result.kind).toBe('jaw');
      expect(result.stepNumber).toBe(2);
    });

    test('parses jaw stage when extension is missing', () => {
      // Arrange / Act
      const result = parseRunFileName('run_step_05_hollow_mandible');

      // Assert
      expect(result).toMatchObject({
        kind: 'jaw',
        stepNumber: 5,
        jaw: 'mandible',
        stageTitle: 'Hollow',
      });
    });

    test('does not treat jaw+high step as a jaw pair stage', () => {
      // Arrange — maxilla token with step beyond Solid
      const result = parseRunFileName('run_step_08_export_maxilla.stl');

      // Assert — attachment matcher path / step hint, not jaw 0–6
      expect(result.kind).not.toBe('jaw');
      expect(result.jaw).toBeNull();
    });

    test('jaw token without step_XX falls back to attachments label', () => {
      // Arrange / Act
      const result = parseRunFileName('clean_maxilla.stl');

      // Assert
      expect(result).toMatchObject({
        kind: 'attachment',
        stepNumber: null,
        jaw: null,
        pipelineStageId: PIPELINE_STAGES.ATTACHMENTS.id,
        label: 'Clean Maxilla',
      });
    });

    test('unknown filename without step becomes attachments with title-cased label', () => {
      // Arrange / Act
      const result = parseRunFileName('random_notes.txt');

      // Assert
      expect(result).toMatchObject({
        kind: 'attachment',
        stepNumber: null,
        pipelineStageId: PIPELINE_STAGES.ATTACHMENTS.id,
        label: 'Random Notes',
      });
    });

    test('uses the first step_XX token when multiple appear', () => {
      // Arrange — non-global regex; documents first-match behavior
      const result = parseRunFileName(
        'prefix_step_01_reoriented_step_02_clean_maxilla.stl'
      );

      // Assert
      expect(result.kind).toBe('jaw');
      expect(result.stepNumber).toBe(1);
      expect(result.stageTitle).toBe('Reoriented');
    });

    test('yields an empty label for step_07 with no descriptive segment', () => {
      // Arrange / Act
      const result = parseRunFileName('step_07_.stl');

      // Assert — attachments step hint path (no `|| fileName` fallback)
      expect(result).toMatchObject({
        kind: 'attachment',
        stepNumber: 7,
        pipelineStageId: PIPELINE_STAGES.ATTACHMENTS.id,
        label: '',
      });
    });

    test('falls back to the original filename when fallback label is empty', () => {
      // Arrange — early step without jaw; unknown path uses `label || fileName`
      const fileName = 'run_step_02_.stl';

      // Act
      const result = parseRunFileName(fileName);

      // Assert
      expect(result).toMatchObject({
        kind: 'attachment',
        stepNumber: 2,
        pipelineStageId: PIPELINE_STAGES.ATTACHMENTS.id,
        label: fileName,
      });
    });
  });
});

describe('getRunFileIdentityKey', () => {
  describe('jaw identities', () => {
    test.each([
      ['run_step_00_input_maxilla.ply', 'jaw:0:maxilla'],
      ['run_step_00_input_mandible.ply', 'jaw:0:mandible'],
      ['run_step_02_clean_maxilla.stl', 'jaw:2:maxilla'],
      ['run_step_02_clean_mandible.stl', 'jaw:2:mandible'],
      ['run_step_06_solid_maxilla.stl', 'jaw:6:maxilla'],
      ['CASE_STEP_05_HOLLOW_MANDIBLE.STL', 'jaw:5:mandible'],
    ])('maps %s → %s', (fileName, identity) => {
      // Arrange / Act / Assert
      expect(getRunFileIdentityKey(fileName)).toBe(identity);
    });

    test('ignores run-specific prefixes for the same logical jaw artifact', () => {
      // Arrange
      const a = getRunFileIdentityKey('patientA_step_02_clean_maxilla.stl');
      const b = getRunFileIdentityKey('patientB_step_02_clean_maxilla.stl');

      // Assert — resume cache key must not include patient/run prefix
      expect(a).toBe('jaw:2:maxilla');
      expect(a).toBe(b);
    });
  });

  describe('attachment identities', () => {
    test.each([
      ['run_step_07_wall.stl', 'attachment:Wall'],
      ['run_step_07_wall_fill_only.stl', 'attachment:Wall Fill Only'],
      ['run_step_08_blade.stl', 'attachment:Blade'],
      ['run_step_09_prong_engraved.stl', 'attachment:Prong Engraved'],
    ])('maps %s → %s', (fileName, identity) => {
      expect(getRunFileIdentityKey(fileName)).toBe(identity);
    });

    test('keeps Wall and Wall Fill Only as distinct identities (regression)', () => {
      // Arrange / Act
      const wall = getRunFileIdentityKey('run_step_07_wall.stl');
      const fillOnly = getRunFileIdentityKey('run_step_07_wall_fill_only.stl');

      // Assert
      expect(wall).toBe('attachment:Wall');
      expect(fillOnly).toBe('attachment:Wall Fill Only');
      expect(wall).not.toBe(fillOnly);
    });

    test('uses fallback label for unknown attachment-like files', () => {
      expect(getRunFileIdentityKey('run_step_07_mystery_part.stl')).toBe(
        'attachment:Mystery Part'
      );
    });
  });

  describe('final identities', () => {
    test.each([
      ['run_step_10_prong_placed.stl'],
      ['run_step_10_prong_attached.stl'],
      ['export_prong_placed.stl'],
      ['export_prong_attached.stl'],
    ])('maps %s to a stable final:prong_placed key', (fileName) => {
      // Arrange / Act / Assert
      expect(getRunFileIdentityKey(fileName)).toBe('final:prong_placed');
    });

    test('collapses prong_placed and prong_attached to the same identity', () => {
      // Arrange / Act
      const placed = getRunFileIdentityKey('run_step_10_prong_placed.stl');
      const attached = getRunFileIdentityKey('run_step_10_prong_attached.stl');

      // Assert
      expect(placed).toBe(attached);
    });
  });

  describe('edge cases', () => {
    test('defaults empty input to an attachment identity', () => {
      // Arrange / Act
      const key = getRunFileIdentityKey();

      // Assert
      expect(key.startsWith('attachment:')).toBe(true);
    });

    test('does not use jaw identity when jaw token lacks a 0–6 step', () => {
      // Arrange / Act
      const key = getRunFileIdentityKey('clean_maxilla.stl');

      // Assert
      expect(key).toBe('attachment:Clean Maxilla');
      expect(key.startsWith('jaw:')).toBe(false);
    });
  });
});
