import { PIPELINE_STAGES } from './constants';
import { getRunFileIdentityKey } from './utils';

/**
 * Identity keys must match getRunFileIdentityKey() / parseRunFileName().
 *
 * Backend note: Resume reuses the same run directory. GET /runs/{id} returns
 * every file in that folder (files[] is NOT filtered by current_step).
 * download_url changes with run_id. Visibility and downloads must be gated
 * by progress — never treat files[] as "ready to display".
 *
 * from_step = N keeps stage N as input (not re-executed). Invalidation lists
 * everything AFTER N. Those identities are dropped from the blob cache and
 * refilled with the same progressive rule as the initial pipeline
 * (progressStep < currentStep) so stale shared-folder bytes are never shown.
 */

const jawPair = (stageId) => [
  `jaw:${stageId}:maxilla`,
  `jaw:${stageId}:mandible`,
];

export const RESUME_FILE_IDENTITIES = {
  INPUT: jawPair(PIPELINE_STAGES.INPUT.id),
  REORIENTED: jawPair(PIPELINE_STAGES.REORIENTED.id),
  CLEAN: jawPair(PIPELINE_STAGES.CLEAN.id),
  TEETH_REMOVED: jawPair(PIPELINE_STAGES.TEETH_REMOVED.id),
  TRIMMED: jawPair(PIPELINE_STAGES.TRIMMED.id),
  HOLLOW: jawPair(PIPELINE_STAGES.HOLLOW.id),
  SOLID: jawPair(PIPELINE_STAGES.SOLID.id),
  WALL: ['attachment:Wall'],
  WALL_FILL_ONLY: ['attachment:Wall Fill Only'],
  BLADE: ['attachment:Blade'],
  PRONG_ENGRAVED: ['attachment:Prong Engraved'],
  FINAL: ['final:prong_placed'],
};

const ALL_ATTACHMENTS_AND_FINAL = [
  ...RESUME_FILE_IDENTITIES.WALL,
  ...RESUME_FILE_IDENTITIES.WALL_FILL_ONLY,
  ...RESUME_FILE_IDENTITIES.BLADE,
  ...RESUME_FILE_IDENTITIES.PRONG_ENGRAVED,
  ...RESUME_FILE_IDENTITIES.FINAL,
];

/**
 * Download-cache invalidation after successful resume.
 * Jaw 2–6: remove everything AFTER that stage.
 * Attachment 7–9: remove later attachments + final.
 */
export const RESUME_DOWNLOAD_INVALIDATION = {
  2: [
    ...RESUME_FILE_IDENTITIES.TEETH_REMOVED,
    ...RESUME_FILE_IDENTITIES.TRIMMED,
    ...RESUME_FILE_IDENTITIES.HOLLOW,
    ...RESUME_FILE_IDENTITIES.SOLID,
    ...ALL_ATTACHMENTS_AND_FINAL,
  ],
  3: [
    ...RESUME_FILE_IDENTITIES.TRIMMED,
    ...RESUME_FILE_IDENTITIES.HOLLOW,
    ...RESUME_FILE_IDENTITIES.SOLID,
    ...ALL_ATTACHMENTS_AND_FINAL,
  ],
  4: [
    ...RESUME_FILE_IDENTITIES.HOLLOW,
    ...RESUME_FILE_IDENTITIES.SOLID,
    ...ALL_ATTACHMENTS_AND_FINAL,
  ],
  5: [...RESUME_FILE_IDENTITIES.SOLID, ...ALL_ATTACHMENTS_AND_FINAL],
  6: [...ALL_ATTACHMENTS_AND_FINAL],
  7: [
    ...RESUME_FILE_IDENTITIES.BLADE,
    ...RESUME_FILE_IDENTITIES.PRONG_ENGRAVED,
    ...RESUME_FILE_IDENTITIES.FINAL,
  ],
  8: [
    ...RESUME_FILE_IDENTITIES.PRONG_ENGRAVED,
    ...RESUME_FILE_IDENTITIES.FINAL,
  ],
  9: [...RESUME_FILE_IDENTITIES.FINAL],
};

export const RESUME_OVERRIDE_INVALIDATION = {
  2: [...RESUME_FILE_IDENTITIES.CLEAN, ...RESUME_DOWNLOAD_INVALIDATION[2]],
  3: [
    ...RESUME_FILE_IDENTITIES.TEETH_REMOVED,
    ...RESUME_DOWNLOAD_INVALIDATION[3],
  ],
  4: [...RESUME_FILE_IDENTITIES.TRIMMED, ...RESUME_DOWNLOAD_INVALIDATION[4]],
  5: [...RESUME_FILE_IDENTITIES.HOLLOW, ...RESUME_DOWNLOAD_INVALIDATION[5]],
  6: [...RESUME_FILE_IDENTITIES.SOLID, ...RESUME_DOWNLOAD_INVALIDATION[6]],
  7: [
    ...RESUME_FILE_IDENTITIES.WALL,
    ...RESUME_FILE_IDENTITIES.WALL_FILL_ONLY,
    ...RESUME_DOWNLOAD_INVALIDATION[7],
  ],
  8: [...RESUME_FILE_IDENTITIES.BLADE, ...RESUME_DOWNLOAD_INVALIDATION[8]],
  9: [
    ...RESUME_FILE_IDENTITIES.PRONG_ENGRAVED,
    ...RESUME_DOWNLOAD_INVALIDATION[9],
  ],
};

export const RESUME_SELECTION_IDENTITIES = {
  2: RESUME_FILE_IDENTITIES.CLEAN,
  3: RESUME_FILE_IDENTITIES.TEETH_REMOVED,
  4: RESUME_FILE_IDENTITIES.TRIMMED,
  5: RESUME_FILE_IDENTITIES.HOLLOW,
  6: RESUME_FILE_IDENTITIES.SOLID,
  7: [
    ...RESUME_FILE_IDENTITIES.WALL,
    ...RESUME_FILE_IDENTITIES.WALL_FILL_ONLY,
  ],
  8: RESUME_FILE_IDENTITIES.BLADE,
  9: RESUME_FILE_IDENTITIES.PRONG_ENGRAVED,
};

export const getResumeDownloadInvalidationIdentities = (resumeStep) =>
  new Set(RESUME_DOWNLOAD_INVALIDATION[resumeStep] || []);

export const getResumeOverrideInvalidationIdentities = (resumeStep) =>
  new Set(RESUME_OVERRIDE_INVALIDATION[resumeStep] || []);

export const getSelectionForResumeStep = (files = [], resumeStep) => {
  const wanted = RESUME_SELECTION_IDENTITIES[resumeStep];
  if (!wanted?.length) return [];

  const byIdentity = new Map(
    files.map((file) => [getRunFileIdentityKey(file.name), file])
  );

  const matched = wanted
    .map((key) => byIdentity.get(key))
    .filter(Boolean);

  if (resumeStep === 7 && matched.length > 1) {
    return [matched[0]];
  }

  return matched;
};

/** Optional identities — backend may omit these. */
const OPTIONAL_DOWNLOAD_IDENTITIES = new Set([
  'attachment:Wall Fill Only',
]);

/**
 * True when every identity that must be regenerated after resumeStep is
 * present in the local download cache (status=done alone is not enough).
 */
export const areExpectedDownloadsReady = (
  downloadedFiles = [],
  resumeStep = null
) => {
  const present = new Set(
    downloadedFiles.map((file) => getRunFileIdentityKey(file.name))
  );

  if (resumeStep === null || resumeStep === undefined) {
    return present.has('final:prong_placed');
  }

  const required = getResumeDownloadInvalidationIdentities(resumeStep);
  if (required.size === 0) {
    return present.has('final:prong_placed');
  }

  for (const key of required) {
    if (OPTIONAL_DOWNLOAD_IDENTITIES.has(key)) continue;
    if (!present.has(key)) return false;
  }
  return true;
};
