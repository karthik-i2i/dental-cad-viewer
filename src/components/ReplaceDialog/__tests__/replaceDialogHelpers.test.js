import { describe, expect, it } from 'vitest';
import { SELECTION_MODE } from '../../ResultViewer/constants';
import {
  buildReplaceConfirmPayload,
  createEmptyReplacementFiles,
  getReplaceDialogConfiguration,
  getRequiredReplacementSlots,
  isReplaceReady,
} from '../replaceDialogHelpers';

const file = (name) => ({ name });

const cleanMaxilla = file('run_step_02_clean_maxilla.stl');
const cleanMandible = file('run_step_02_clean_mandible.stl');
const wall = file('run_step_07_wall.stl');

describe('getReplaceDialogConfiguration', () => {
  it('returns null when selection is not replaceable', () => {
    expect(getReplaceDialogConfiguration([])).toBeNull();
    expect(
      getReplaceDialogConfiguration([file('run_step_10_prong_placed.stl')])
    ).toBeNull();
  });

  it('builds jaw slots for a clean maxilla/mandible selection', () => {
    const config = getReplaceDialogConfiguration([
      cleanMaxilla,
      cleanMandible,
    ]);

    expect(config).toMatchObject({
      mode: SELECTION_MODE.JAW,
      selectionMode: SELECTION_MODE.JAW,
      actionKey: 'clean',
      resumeStep: 2,
      title: 'Replace Files',
    });
    expect(config.slots).toEqual([
      {
        slotKey: 'maxilla',
        kind: 'jaw',
        jaw: 'maxilla',
        label: 'Maxilla',
      },
      {
        slotKey: 'mandible',
        kind: 'jaw',
        jaw: 'mandible',
        label: 'Mandible',
      },
    ]);
  });

  it('builds a single attachment slot for wall', () => {
    const config = getReplaceDialogConfiguration([wall]);

    expect(config).toMatchObject({
      mode: SELECTION_MODE.SINGLE,
      actionKey: 'wall',
      resumeStep: 7,
      title: 'Replace File',
    });
    expect(config.slots).toEqual([
      {
        slotKey: 'attachment',
        kind: 'attachment',
        jaw: null,
        label: 'Wall',
      },
    ]);
  });
});

describe('isReplaceReady / buildReplaceConfirmPayload', () => {
  it('requires every configured slot before ready', () => {
    const config = getReplaceDialogConfiguration([
      cleanMaxilla,
      cleanMandible,
    ]);
    const empty = createEmptyReplacementFiles();

    expect(getRequiredReplacementSlots(config)).toEqual([
      'maxilla',
      'mandible',
    ]);
    expect(isReplaceReady(config, empty)).toBe(false);

    const maxilla = new File(['m'], 'max.stl');
    const mandible = new File(['n'], 'mand.stl');
    expect(
      isReplaceReady(config, { ...empty, maxilla, mandible })
    ).toBe(true);

    const payload = buildReplaceConfirmPayload(config, {
      ...empty,
      maxilla,
      mandible,
    });

    expect(payload).toMatchObject({
      actionKey: 'clean',
      resumeStep: 2,
      selectionMode: SELECTION_MODE.JAW,
      replacementFiles: { maxilla, mandible },
    });
    expect(payload.selectedFiles).toEqual([cleanMaxilla, cleanMandible]);
  });

  it('builds an attachment payload when ready', () => {
    const config = getReplaceDialogConfiguration([wall]);
    const attachment = new File(['a'], 'wall.stl');

    expect(isReplaceReady(config, { attachment })).toBe(true);
    expect(buildReplaceConfirmPayload(config, { attachment })).toMatchObject({
      actionKey: 'wall',
      resumeStep: 7,
      selectionMode: SELECTION_MODE.SINGLE,
      replacementFiles: { attachment },
    });
  });

  it('returns null payload when config is missing', () => {
    expect(buildReplaceConfirmPayload(null, {})).toBeNull();
  });
});
