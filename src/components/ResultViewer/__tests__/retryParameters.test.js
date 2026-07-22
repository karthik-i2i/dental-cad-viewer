import { describe, expect, it } from 'vitest';
import {
  areRetryParametersValid,
  extractRetryParameters,
  formatParameterLabel,
  isAllowedNumericDraftInput,
  isNumericParameterValue,
  isValidNumericDraftValue,
  toParameterDraft,
} from '../retryParameters';

describe('formatParameterLabel', () => {
  it('humanizes snake_case keys', () => {
    expect(formatParameterLabel('trim_offset')).toBe('Trim offset');
    expect(formatParameterLabel('depth_mm')).toBe('Depth mm');
    expect(formatParameterLabel('gum_depth_mm')).toBe('Gum depth mm');
    expect(formatParameterLabel('smooth_lambda')).toBe('Smooth lambda');
  });

  it('handles single-word and empty keys', () => {
    expect(formatParameterLabel('offset')).toBe('Offset');
    expect(formatParameterLabel('')).toBe('');
  });
});

describe('isNumericParameterValue', () => {
  it('accepts finite numbers only', () => {
    expect(isNumericParameterValue(5)).toBe(true);
    expect(isNumericParameterValue(5.0)).toBe(true);
    expect(isNumericParameterValue(0.35)).toBe(true);
    expect(isNumericParameterValue(NaN)).toBe(false);
    expect(isNumericParameterValue(Infinity)).toBe(false);
    expect(isNumericParameterValue('5')).toBe(false);
    expect(isNumericParameterValue('C:\\Blades')).toBe(false);
    expect(isNumericParameterValue(null)).toBe(false);
  });
});

describe('toParameterDraft', () => {
  it('keeps only finite numeric backend values as strings', () => {
    expect(
      toParameterDraft({
        wall_thickness: 5.0,
        blade_dir: 'C:\\Users\\...\\Blades',
        prong_stl: 'C:\\Users\\...\\PRONG PIECES.stl',
        trim_offset: 0.35,
      })
    ).toEqual({
      wall_thickness: '5',
      trim_offset: '0.35',
    });
  });

  it('stringifies values without reformatting numbers', () => {
    expect(toParameterDraft({ trim_offset: 0.35, depth_mm: 4.5 })).toEqual({
      trim_offset: '0.35',
      depth_mm: '4.5',
    });
  });

  it('returns empty object for missing, invalid, or string-only parameters', () => {
    expect(toParameterDraft(undefined)).toEqual({});
    expect(toParameterDraft(null)).toEqual({});
    expect(toParameterDraft([])).toEqual({});
    expect(toParameterDraft({ blade_dir: 'C:\\Blades' })).toEqual({});
    expect(toParameterDraft({})).toEqual({});
  });
});

describe('numeric draft input helpers', () => {
  it('allows partial and complete numeric input while typing', () => {
    expect(isAllowedNumericDraftInput('')).toBe(true);
    expect(isAllowedNumericDraftInput('-')).toBe(true);
    expect(isAllowedNumericDraftInput('4')).toBe(true);
    expect(isAllowedNumericDraftInput('4.')).toBe(true);
    expect(isAllowedNumericDraftInput('4.5')).toBe(true);
    expect(isAllowedNumericDraftInput('0.35')).toBe(true);
    expect(isAllowedNumericDraftInput('10')).toBe(true);
  });

  it('rejects alphabetic and malformed input', () => {
    expect(isAllowedNumericDraftInput('abc')).toBe(false);
    expect(isAllowedNumericDraftInput('4abc')).toBe(false);
    expect(isAllowedNumericDraftInput('hello')).toBe(false);
    expect(isAllowedNumericDraftInput('4.5.6')).toBe(false);
    expect(isAllowedNumericDraftInput('1e2')).toBe(false);
  });

  it('validates complete numeric draft values for submit', () => {
    expect(isValidNumericDraftValue('4')).toBe(true);
    expect(isValidNumericDraftValue('4.5')).toBe(true);
    expect(isValidNumericDraftValue('0.35')).toBe(true);
    expect(isValidNumericDraftValue('10')).toBe(true);
    expect(isValidNumericDraftValue('-2.5')).toBe(true);

    expect(isValidNumericDraftValue('')).toBe(false);
    expect(isValidNumericDraftValue('-')).toBe(false);
    expect(isValidNumericDraftValue('4.')).toBe(false);
    expect(isValidNumericDraftValue('abc')).toBe(false);
    expect(isValidNumericDraftValue('4abc')).toBe(false);
  });

  it('treats an empty draft as valid and rejects any invalid entry', () => {
    expect(areRetryParametersValid({})).toBe(true);
    expect(areRetryParametersValid({ wall_thickness: '5' })).toBe(true);
    expect(
      areRetryParametersValid({ wall_thickness: '5', trim_offset: '0.35' })
    ).toBe(true);
    expect(areRetryParametersValid({ wall_thickness: '' })).toBe(false);
    expect(areRetryParametersValid({ wall_thickness: '4.' })).toBe(false);
    expect(
      areRetryParametersValid({ wall_thickness: '5', trim_offset: 'abc' })
    ).toBe(false);
  });
});

describe('extractRetryParameters', () => {
  const runFiles = [
    {
      name: 'case_step_02_clean_maxilla.stl',
      parameters: { artifact_min_faces: 500 },
    },
    {
      name: 'case_step_02_clean_mandible.stl',
      parameters: { artifact_min_faces: 500 },
    },
    {
      name: 'case_step_04_trimmed_maxilla.stl',
      parameters: { trim_offset: 0.35, depth_mm: 4.5 },
    },
    {
      name: 'case_step_07_wall.stl',
      parameters: {},
    },
    {
      name: 'case_step_08_blade.stl',
      parameters: {
        wall_thickness: 5.0,
        blade_dir: 'C:\\Users\\...\\Blades',
      },
    },
  ];

  it('returns draft from the matching poll file for the selection', () => {
    expect(
      extractRetryParameters(runFiles, [
        { name: 'case_step_04_trimmed_maxilla.stl' },
      ])
    ).toEqual({
      trim_offset: '0.35',
      depth_mm: '4.5',
    });
  });

  it('uses the first selected file with non-empty numeric parameters', () => {
    expect(
      extractRetryParameters(runFiles, [
        { name: 'case_step_02_clean_maxilla.stl' },
        { name: 'case_step_02_clean_mandible.stl' },
      ])
    ).toEqual({
      artifact_min_faces: '500',
    });
  });

  it('omits non-numeric backend parameters', () => {
    expect(
      extractRetryParameters(runFiles, [{ name: 'case_step_08_blade.stl' }])
    ).toEqual({
      wall_thickness: '5',
    });
  });

  it('returns empty object when parameters are missing, empty, or non-numeric', () => {
    expect(
      extractRetryParameters(runFiles, [{ name: 'case_step_07_wall.stl' }])
    ).toEqual({});
    expect(extractRetryParameters([], [{ name: 'x.stl' }])).toEqual({});
    expect(extractRetryParameters(runFiles, [])).toEqual({});
  });
});
