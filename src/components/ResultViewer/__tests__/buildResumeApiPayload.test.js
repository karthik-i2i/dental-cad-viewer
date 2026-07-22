import { describe, expect, it } from 'vitest';
import { SELECTION_MODE } from '../constants';
import { buildResumeApiPayload } from '../hooks/useResumeActions';

describe('buildResumeApiPayload', () => {
  it('returns fromStep only for Retry without replacements', () => {
    expect(
      buildResumeApiPayload({
        fromStep: 4,
        replacementFiles: null,
      })
    ).toEqual({ fromStep: 4 });
  });

  it('includes parameters when the draft is non-empty', () => {
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

  it('maps single-attachment replace files to file', () => {
    const attachment = new File(['a'], 'wall.stl');
    expect(
      buildResumeApiPayload({
        fromStep: 7,
        selectionMode: SELECTION_MODE.SINGLE,
        replacementFiles: { attachment },
      })
    ).toEqual({
      fromStep: 7,
      file: attachment,
    });
  });

  it('maps jaw replace files to maxilla/mandible fields', () => {
    const maxilla = new File(['m'], 'max.stl');
    const mandible = new File(['n'], 'mand.stl');
    expect(
      buildResumeApiPayload({
        fromStep: 2,
        selectionMode: SELECTION_MODE.JAW,
        replacementFiles: { maxilla, mandible },
      })
    ).toEqual({
      fromStep: 2,
      maxilla,
      mandible,
    });
  });
});
