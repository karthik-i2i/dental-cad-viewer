import {
  RETRY_REPLACE_TOOLTIPS,
  SELECTION_MODE,
} from '../constants';
import {
  evaluateRetryReplaceSelection,
  getFileParseName,
  getResumeStage,
  getRetryReplaceTooltip,
  getSelectionMetadata,
  getStageActionKey,
  isRetryReplaceAllowed,
} from '../resumeSelection';

/** Build a selection file. Prefer `name` with step_XX for backend-style fixtures. */
const file = (name, path) => ({ name, ...(path ? { path } : {}) });

const FILES = {
  inputMaxilla: file('run_step_00_input_maxilla.ply'),
  inputMandible: file('run_step_00_input_mandible.ply'),
  reorientedMaxilla: file('run_step_01_reoriented_maxilla.ply'),
  reorientedMandible: file('run_step_01_reoriented_mandible.ply'),
  cleanMaxilla: file('run_step_02_clean_maxilla.stl'),
  cleanMandible: file('run_step_02_clean_mandible.stl'),
  teethRemovedMaxilla: file('run_step_03_teeth_removed_maxilla.ply'),
  teethRemovedMandible: file('run_step_03_teeth_removed_mandible.ply'),
  trimmedMaxilla: file('run_step_04_trimmed_maxilla.stl'),
  hollowMaxilla: file('run_step_05_hollow_maxilla.stl'),
  hollowMandible: file('run_step_05_hollow_mandible.stl'),
  solidMaxilla: file('run_step_06_solid_maxilla.stl'),
  solidMandible: file('run_step_06_solid_mandible.stl'),
  wall: file('run_step_07_wall.stl'),
  wallFillOnly: file('run_step_07_wall_fill_only.stl'),
  blade: file('run_step_08_blade.stl'),
  prongEngraved: file('run_step_09_prong_engraved.stl'),
  prongPlaced: file('run_step_10_prong_placed.stl'),
  /** Display name without step; parse must use path (demo STL_FILES shape). */
  demoCleanMaxilla: file(
    'Clean Maxilla',
    '/models/su31626_step_02_clean_maxilla.stl'
  ),
  unrecognized: file('notes.txt'),
};

describe('getFileParseName', () => {
  test('prefers a candidate that contains step_XX', () => {
    // Arrange
    const input = {
      name: 'Clean Maxilla',
      path: '/models/case_step_02_clean_maxilla.stl',
    };

    // Act
    const result = getFileParseName(input);

    // Assert
    expect(result).toBe('case_step_02_clean_maxilla.stl');
  });

  test('uses basename when the step-bearing value is a path', () => {
    // Arrange
    const input = {
      name: 'ignored',
      path: '/a/b/run_step_05_hollow_mandible.stl',
    };

    // Act / Assert
    expect(getFileParseName(input)).toBe('run_step_05_hollow_mandible.stl');
  });

  test('falls back to path basename when neither candidate has step_XX', () => {
    // Arrange
    const input = { name: 'Clean Maxilla', path: '/models/clean_maxilla.stl' };

    // Act / Assert
    expect(getFileParseName(input)).toBe('clean_maxilla.stl');
  });

  test('falls back to name when path is missing', () => {
    expect(getFileParseName({ name: 'run_step_02_clean_maxilla.stl' })).toBe(
      'run_step_02_clean_maxilla.stl'
    );
  });

  test('returns empty string for an empty file object', () => {
    expect(getFileParseName({})).toBe('');
  });
});

describe('getStageActionKey', () => {
  test('maps jaw pipeline stages to action keys', () => {
    expect(getStageActionKey(FILES.inputMaxilla)).toBe('input');
    expect(getStageActionKey(FILES.reorientedMaxilla)).toBe('reoriented');
    expect(getStageActionKey(FILES.cleanMaxilla)).toBe('clean');
    expect(getStageActionKey(FILES.teethRemovedMaxilla)).toBe('teethRemoved');
    expect(getStageActionKey(FILES.trimmedMaxilla)).toBe('trimmed');
    expect(getStageActionKey(FILES.hollowMaxilla)).toBe('hollow');
    expect(getStageActionKey(FILES.solidMaxilla)).toBe('solid');
  });

  test('maps attachment labels to action keys', () => {
    expect(getStageActionKey(FILES.wall)).toBe('wall');
    expect(getStageActionKey(FILES.wallFillOnly)).toBe('wallFillOnly');
    expect(getStageActionKey(FILES.blade)).toBe('blade');
    expect(getStageActionKey(FILES.prongEngraved)).toBe('prongEngraved');
  });

  test('maps final prong placed output to prongPlaced', () => {
    expect(getStageActionKey(FILES.prongPlaced)).toBe('prongPlaced');
  });

  test('resolves demo files via path when display name has no step', () => {
    expect(getStageActionKey(FILES.demoCleanMaxilla)).toBe('clean');
  });

  test('returns null for unrecognized filenames', () => {
    expect(getStageActionKey(FILES.unrecognized)).toBeNull();
  });
});

describe('getSelectionMetadata', () => {
  test('returns empty array for empty selection', () => {
    expect(getSelectionMetadata([])).toEqual([]);
  });

  test('attaches parse data, action key, and resume step for a jaw file', () => {
    // Arrange
    const selected = [FILES.cleanMaxilla];

    // Act
    const [item] = getSelectionMetadata(selected);

    // Assert
    expect(item.file).toBe(FILES.cleanMaxilla);
    expect(item.actionKey).toBe('clean');
    expect(item.action).toMatchObject({
      title: 'Clean',
      resumeStep: 2,
      selection: SELECTION_MODE.JAW,
    });
    expect(item.stageTitle).toBe('Clean');
    expect(item.resumeStep).toBe(2);
    expect(item.parsed).toMatchObject({
      kind: 'jaw',
      jaw: 'maxilla',
      pipelineStageId: 2,
    });
  });

  test('leaves action null when the file is unrecognized', () => {
    const [item] = getSelectionMetadata([FILES.unrecognized]);
    expect(item.actionKey).toBeNull();
    expect(item.action).toBeNull();
  });
});

describe('evaluateRetryReplaceSelection', () => {
  describe('gatekeeping', () => {
    test('blocks when the viewer is not ready', () => {
      // Arrange / Act
      const result = evaluateRetryReplaceSelection([FILES.cleanMaxilla], {
        viewerReady: false,
      });

      // Assert
      expect(result).toMatchObject({
        isValid: false,
        canRetry: false,
        canReplace: false,
        reason: 'VIEWER_NOT_READY',
        tooltip: RETRY_REPLACE_TOOLTIPS.VIEWER_NOT_READY,
      });
    });

    test('blocks when nothing is selected', () => {
      const result = evaluateRetryReplaceSelection([]);

      expect(result).toMatchObject({
        isValid: false,
        canRetry: false,
        canReplace: false,
        reason: 'NO_SELECTION',
        tooltip: RETRY_REPLACE_TOOLTIPS.NO_SELECTION,
      });
    });

    test('blocks when more than two files are selected', () => {
      const result = evaluateRetryReplaceSelection([
        FILES.cleanMaxilla,
        FILES.cleanMandible,
        FILES.hollowMaxilla,
      ]);

      expect(result).toMatchObject({
        isValid: false,
        reason: 'TOO_MANY',
        tooltip: RETRY_REPLACE_TOOLTIPS.TOO_MANY,
      });
    });

    test('blocks unrecognized files', () => {
      const result = evaluateRetryReplaceSelection([FILES.unrecognized]);

      expect(result).toMatchObject({
        isValid: false,
        reason: 'UNRECOGNIZED',
        tooltip: RETRY_REPLACE_TOOLTIPS.TOO_MANY,
      });
      expect(result.items).toHaveLength(1);
    });
  });

  describe('final and early stages', () => {
    test('blocks final prong placed output', () => {
      const result = evaluateRetryReplaceSelection([FILES.prongPlaced]);

      expect(result).toMatchObject({
        isValid: false,
        canRetry: false,
        canReplace: false,
        reason: 'FINAL',
        actionKey: 'prongPlaced',
        selectionMode: SELECTION_MODE.NONE,
        tooltip: RETRY_REPLACE_TOOLTIPS.FINAL,
        stageTitle: 'Prong Placed',
      });
    });

    test('blocks Input-only selection as early stage', () => {
      const result = evaluateRetryReplaceSelection([
        FILES.inputMaxilla,
        FILES.inputMandible,
      ]);

      expect(result).toMatchObject({
        isValid: false,
        reason: 'EARLY_STAGE',
        tooltip: RETRY_REPLACE_TOOLTIPS.EARLY_STAGE,
        selectionMode: SELECTION_MODE.NONE,
      });
    });

    test('blocks Reoriented-only selection as early stage', () => {
      const result = evaluateRetryReplaceSelection([FILES.reorientedMaxilla]);

      expect(result).toMatchObject({
        isValid: false,
        reason: 'EARLY_STAGE',
        actionKey: 'reoriented',
      });
    });

    test('blocks mixed early + later stages', () => {
      const result = evaluateRetryReplaceSelection([
        FILES.inputMaxilla,
        FILES.cleanMandible,
      ]);

      expect(result).toMatchObject({
        isValid: false,
        reason: 'MIXED_STAGES',
        tooltip: RETRY_REPLACE_TOOLTIPS.MIXED_STAGES,
      });
    });
  });

  describe('mixed stages', () => {
    test('blocks two different jaw stages', () => {
      const result = evaluateRetryReplaceSelection([
        FILES.cleanMaxilla,
        FILES.hollowMandible,
      ]);

      expect(result).toMatchObject({
        isValid: false,
        reason: 'MIXED_STAGES',
        tooltip: RETRY_REPLACE_TOOLTIPS.MIXED_STAGES,
      });
    });

    test('blocks jaw + attachment mix', () => {
      const result = evaluateRetryReplaceSelection([
        FILES.cleanMaxilla,
        FILES.wall,
      ]);

      expect(result).toMatchObject({
        isValid: false,
        reason: 'MIXED_STAGES',
      });
    });

    test('blocks two different attachments', () => {
      const result = evaluateRetryReplaceSelection([FILES.wall, FILES.blade]);

      expect(result).toMatchObject({
        isValid: false,
        reason: 'MIXED_STAGES',
      });
    });
  });

  describe('valid jaw selections', () => {
    test('allows a single Clean jaw', () => {
      const result = evaluateRetryReplaceSelection([FILES.cleanMaxilla]);

      expect(result).toMatchObject({
        isValid: true,
        canRetry: true,
        canReplace: true,
        reason: 'VALID',
        tooltip: null,
        actionKey: 'clean',
        resumeStep: 2,
        stageTitle: 'Clean',
        selectionMode: SELECTION_MODE.JAW,
      });
    });

    test('allows both Clean jaws (maxilla + mandible)', () => {
      const result = evaluateRetryReplaceSelection([
        FILES.cleanMaxilla,
        FILES.cleanMandible,
      ]);

      expect(result).toMatchObject({
        isValid: true,
        canRetry: true,
        canReplace: true,
        reason: 'VALID',
        actionKey: 'clean',
        resumeStep: 2,
      });
    });

    test('allows later jaw stages (Teeth Removed through Solid)', () => {
      expect(
        evaluateRetryReplaceSelection([FILES.teethRemovedMaxilla])
      ).toMatchObject({
        isValid: true,
        actionKey: 'teethRemoved',
        resumeStep: 3,
      });

      expect(
        evaluateRetryReplaceSelection([
          FILES.hollowMaxilla,
          FILES.hollowMandible,
        ])
      ).toMatchObject({
        isValid: true,
        actionKey: 'hollow',
        resumeStep: 5,
      });

      expect(
        evaluateRetryReplaceSelection([FILES.solidMandible])
      ).toMatchObject({
        isValid: true,
        actionKey: 'solid',
        resumeStep: 6,
      });
    });

    test('allows demo-path Clean selection (step in path only)', () => {
      const result = evaluateRetryReplaceSelection([FILES.demoCleanMaxilla]);

      expect(result).toMatchObject({
        isValid: true,
        actionKey: 'clean',
        resumeStep: 2,
      });
    });

    test('rejects duplicate jaw of the same type at one stage', () => {
      const result = evaluateRetryReplaceSelection([
        FILES.cleanMaxilla,
        file('other_step_02_clean_maxilla.stl'),
      ]);

      expect(result).toMatchObject({
        isValid: false,
        reason: 'DUPLICATE_JAW',
        actionKey: 'clean',
        selectionMode: SELECTION_MODE.JAW,
        tooltip: RETRY_REPLACE_TOOLTIPS.TOO_MANY,
      });
    });
  });

  describe('valid single attachment selections', () => {
    test.each([
      ['wall', FILES.wall, 'Wall', 7],
      ['wallFillOnly', FILES.wallFillOnly, 'Wall Fill Only', 7],
      ['blade', FILES.blade, 'Blade', 8],
      ['prongEngraved', FILES.prongEngraved, 'Prong Engraved', 9],
    ])(
      'allows a single %s attachment',
      (actionKey, selected, stageTitle, resumeStep) => {
        const result = evaluateRetryReplaceSelection([selected]);

        expect(result).toMatchObject({
          isValid: true,
          canRetry: true,
          canReplace: true,
          reason: 'VALID',
          tooltip: null,
          actionKey,
          stageTitle,
          resumeStep,
          selectionMode: SELECTION_MODE.SINGLE,
        });
      }
    );

    test('rejects two files of the same attachment action', () => {
      // Same action key, SINGLE mode requires exactly one item.
      const result = evaluateRetryReplaceSelection([
        FILES.wall,
        file('copy_step_07_wall.stl'),
      ]);

      expect(result).toMatchObject({
        isValid: false,
        reason: 'MULTIPLE_ATTACHMENTS',
        actionKey: 'wall',
        selectionMode: SELECTION_MODE.SINGLE,
        tooltip: RETRY_REPLACE_TOOLTIPS.MULTIPLE_ATTACHMENTS,
      });
    });
  });
});

describe('isRetryReplaceAllowed', () => {
  test('returns true for a valid selection', () => {
    expect(isRetryReplaceAllowed([FILES.cleanMaxilla])).toBe(true);
  });

  test('returns false for an invalid selection', () => {
    expect(isRetryReplaceAllowed([FILES.inputMaxilla])).toBe(false);
  });

  test('respects viewerReady option', () => {
    expect(
      isRetryReplaceAllowed([FILES.cleanMaxilla], { viewerReady: false })
    ).toBe(false);
  });
});

describe('getRetryReplaceTooltip', () => {
  test('returns null when Retry/Replace are allowed', () => {
    expect(getRetryReplaceTooltip([FILES.cleanMaxilla])).toBeNull();
  });

  test('returns the early-stage tooltip for Input', () => {
    expect(getRetryReplaceTooltip([FILES.inputMaxilla])).toBe(
      RETRY_REPLACE_TOOLTIPS.EARLY_STAGE
    );
  });

  test('returns the viewer-not-ready tooltip when loading', () => {
    expect(
      getRetryReplaceTooltip([FILES.cleanMaxilla], { viewerReady: false })
    ).toBe(RETRY_REPLACE_TOOLTIPS.VIEWER_NOT_READY);
  });
});

describe('getResumeStage', () => {
  test('returns stage info for a retryable jaw selection', () => {
    // Arrange / Act
    const stage = getResumeStage([FILES.cleanMaxilla, FILES.cleanMandible]);

    // Assert
    expect(stage).toEqual({
      actionKey: 'clean',
      stageTitle: 'Clean',
      resumeStep: 2,
      selectionMode: SELECTION_MODE.JAW,
    });
  });

  test('returns stage info for a retryable attachment', () => {
    expect(getResumeStage([FILES.blade])).toEqual({
      actionKey: 'blade',
      stageTitle: 'Blade',
      resumeStep: 8,
      selectionMode: SELECTION_MODE.SINGLE,
    });
  });

  test('returns null when the selection is not retryable', () => {
    expect(getResumeStage([FILES.inputMaxilla])).toBeNull();
    expect(getResumeStage([FILES.prongPlaced])).toBeNull();
    expect(getResumeStage([])).toBeNull();
  });
});
