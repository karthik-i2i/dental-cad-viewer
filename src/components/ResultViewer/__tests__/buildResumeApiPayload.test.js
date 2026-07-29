import { describe, expect, it } from 'vitest';
import { SELECTION_MODE } from '../constants';
import { buildResumeApiPayload } from '../hooks/useResumeActions';

describe('buildResumeApiPayload', () => {
  it('Retry: sends from_step = N (no replacement files)', () => {
    expect(
      buildResumeApiPayload({
        fromStep: 4,
        replacementFiles: null,
      })
    ).toEqual({ fromStep: 4 });
  });

  it('Retry: keeps from_step = N when parameters are present', () => {
    expect(
      buildResumeApiPayload({
        fromStep: 4,
        parameters: { trim_offset: '0.35' },
      })
    ).toEqual({
      fromStep: 4,
      parameters: { trim_offset: '0.35' },
    });
  });

  it('omits empty parameters objects', () => {
    expect(
      buildResumeApiPayload({
        fromStep: 4,
        parameters: {},
      })
    ).toEqual({ fromStep: 4 });
  });

  it('Replace: sends from_step = N + 1 for single-attachment files', () => {
    const attachment = new File(['a'], 'wall.stl');
    expect(
      buildResumeApiPayload({
        fromStep: 7,
        selectionMode: SELECTION_MODE.SINGLE,
        replacementFiles: { attachment },
      })
    ).toEqual({
      fromStep: 8,
      file: attachment,
    });
  });

  it('Replace: sends from_step = N + 1 for jaw files', () => {
    const maxilla = new File(['m'], 'max.stl');
    const mandible = new File(['n'], 'mand.stl');
    expect(
      buildResumeApiPayload({
        fromStep: 2,
        selectionMode: SELECTION_MODE.JAW,
        replacementFiles: { maxilla, mandible },
      })
    ).toEqual({
      fromStep: 3,
      maxilla,
      mandible,
    });
  });
});
