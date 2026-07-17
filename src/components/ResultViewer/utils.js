import {
  LOADING_MILESTONES,
  PIPELINE_STAGES,
  PIPELINE_STAGE_ORDER,
  LAST_JAW_STAGE_ID,
  ATTACHMENT_FILE_ORDER,
  FINAL_FILE_MATCHERS,
  VIEWER_REQUIRED_FILES,
} from './constants';
import { RUN_STATUS, deriveRunLifecycle } from './runLifecycle';

export const formatOption = (value) => {
  if (!value) return '—';
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/**
 * Workflow milestone toward opening the ResultViewer.
 *
 * hasRunId          → ACCEPTED (POST succeeded; ResultViewer has run_id)
 * running + step≥0  → GENERATING
 * filesReady        → FILES_READY (85%) or OPENING (100%) when forceOpening
 *
 * Does not invent backend state — only maps real frontend signals.
 */
export const getLoadingMilestone = ({
  hasRunId = false,
  status = null,
  currentStep = null,
  filesReady = false,
  forceOpening = false,
} = {}) => {
  if (filesReady && forceOpening) {
    return {
      milestoneId: LOADING_MILESTONES.OPENING.id,
      progressPercentage: LOADING_MILESTONES.OPENING.progress,
      loadingMessage: LOADING_MILESTONES.OPENING.message,
    };
  }

  if (filesReady) {
    return {
      milestoneId: LOADING_MILESTONES.FILES_READY.id,
      progressPercentage: LOADING_MILESTONES.FILES_READY.progress,
      loadingMessage: LOADING_MILESTONES.FILES_READY.message,
    };
  }

  const lifecycle = deriveRunLifecycle(status);
  const pipelineStarted =
    lifecycle.processing || lifecycle.completed
      ? currentStep !== null && currentStep !== undefined && currentStep >= 0
      : false;

  if (pipelineStarted) {
    return {
      milestoneId: LOADING_MILESTONES.GENERATING.id,
      progressPercentage: LOADING_MILESTONES.GENERATING.progress,
      loadingMessage: LOADING_MILESTONES.GENERATING.message,
    };
  }

  if (hasRunId) {
    return {
      milestoneId: LOADING_MILESTONES.ACCEPTED.id,
      progressPercentage: LOADING_MILESTONES.ACCEPTED.progress,
      loadingMessage: LOADING_MILESTONES.ACCEPTED.message,
    };
  }

  return {
    milestoneId: LOADING_MILESTONES.PREPARING.id,
    progressPercentage: LOADING_MILESTONES.PREPARING.progress,
    loadingMessage: LOADING_MILESTONES.PREPARING.message,
  };
};

/**
 * True when all filename-parsed Input + Reoriented jaw pairs are present
 * in the locally downloaded set. Does not use file count or download order.
 */
export const isViewerReady = (downloadedFiles = []) => {
  const present = new Set();

  downloadedFiles.forEach((file) => {
    const { stepNumber, jaw } = parseRunFileName(file.name);
    if (stepNumber === null || !jaw) return;
    present.add(`${stepNumber}:${jaw}`);
  });

  return VIEWER_REQUIRED_FILES.every(({ stageId, jaw }) =>
    present.has(`${stageId}:${jaw}`)
  );
};

const JAW_ORDER = { maxilla: 0, mandible: 1 };
const JAW_LABELS = { maxilla: 'Maxilla', mandible: 'Mandible' };

/**
 * Initial Model Explorer selection: Reoriented Maxilla + Mandible.
 */
export const getInitialViewerSelection = (downloadedFiles = []) => {
  const reorientedId = PIPELINE_STAGES.REORIENTED.id;

  return downloadedFiles
    .filter((file) => {
      const { pipelineStageId, jaw } = parseRunFileName(file.name);
      return pipelineStageId === reorientedId && Boolean(jaw);
    })
    .sort(
      (a, b) =>
        (JAW_ORDER[parseRunFileName(a.name).jaw] ?? 2) -
        (JAW_ORDER[parseRunFileName(b.name).jaw] ?? 2)
    );
};

/** Title-cases the descriptive part of a filename, e.g. "prong_engraved" → "Prong Engraved". */
const formatFallbackLabel = (withoutExtension) => {
  const descriptivePart = withoutExtension.replace(/^.*step_\d+_/i, '');
  return descriptivePart
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const resolveAttachmentMeta = (lower) => {
  for (const entry of ATTACHMENT_FILE_ORDER) {
    if (entry.match.test(lower)) {
      return {
        pipelineStageId: PIPELINE_STAGES.ATTACHMENTS.id,
        stageTitle: PIPELINE_STAGES.ATTACHMENTS.title,
        label: entry.label,
        sortOrder: entry.order,
        kind: 'attachment',
      };
    }
  }
  return null;
};

const resolveFinalMeta = (lower) => {
  for (const entry of FINAL_FILE_MATCHERS) {
    if (entry.match.test(lower)) {
      return {
        pipelineStageId: PIPELINE_STAGES.FINAL.id,
        stageTitle: PIPELINE_STAGES.FINAL.title,
        label: entry.label,
        sortOrder: 0,
        kind: 'final',
      };
    }
  }
  return null;
};

/**
 * Parses a backend-generated filename into explorer metadata.
 * Stage/jaw/kind come only from the filename — never from response order.
 */
export const parseRunFileName = (fileName = '') => {
  const withoutExtension = fileName.replace(/\.[^./]+$/, '');
  const lower = withoutExtension.toLowerCase();

  const stepMatch = lower.match(/step_(\d+)/);
  const stepNumber = stepMatch ? parseInt(stepMatch[1], 10) : null;

  const jaw = lower.includes('maxilla')
    ? 'maxilla'
    : lower.includes('mandible')
      ? 'mandible'
      : null;

  // Jaw stages 0–6: prefer explicit step + jaw.
  if (
    jaw &&
    stepNumber !== null &&
    stepNumber >= 0 &&
    stepNumber <= LAST_JAW_STAGE_ID
  ) {
    const stage =
      PIPELINE_STAGE_ORDER.find((s) => s.id === stepNumber) ||
      PIPELINE_STAGES.INPUT;

    return {
      stepNumber,
      pipelineStageId: stage.id,
      jaw,
      stageTitle: stage.title,
      label: JAW_LABELS[jaw],
      sortOrder: JAW_ORDER[jaw],
      kind: 'jaw',
    };
  }

  const finalMeta = resolveFinalMeta(lower);
  if (finalMeta) {
    return { stepNumber, jaw: null, ...finalMeta };
  }

  const attachmentMeta = resolveAttachmentMeta(lower);
  if (attachmentMeta) {
    return { stepNumber, jaw: null, ...attachmentMeta };
  }

  // Filename step hints when name tokens are missing.
  if (stepNumber === PIPELINE_STAGES.ATTACHMENTS.id) {
    return {
      stepNumber,
      pipelineStageId: PIPELINE_STAGES.ATTACHMENTS.id,
      jaw: null,
      stageTitle: PIPELINE_STAGES.ATTACHMENTS.title,
      label: formatFallbackLabel(withoutExtension),
      sortOrder: ATTACHMENT_FILE_ORDER.length,
      kind: 'attachment',
    };
  }

  if (stepNumber !== null && stepNumber > LAST_JAW_STAGE_ID) {
    // step_08 / step_09 historically = attachments; step_10 = final
    if (stepNumber >= 10) {
      return {
        stepNumber,
        pipelineStageId: PIPELINE_STAGES.FINAL.id,
        jaw: null,
        stageTitle: PIPELINE_STAGES.FINAL.title,
        label: formatFallbackLabel(withoutExtension),
        sortOrder: 0,
        kind: 'final',
      };
    }

    return {
      stepNumber,
      pipelineStageId: PIPELINE_STAGES.ATTACHMENTS.id,
      jaw: null,
      stageTitle: PIPELINE_STAGES.ATTACHMENTS.title,
      label: formatFallbackLabel(withoutExtension),
      sortOrder: stepNumber,
      kind: 'attachment',
    };
  }

  // Unknown non-jaw file → Attachments with a readable label.
  return {
    stepNumber,
    pipelineStageId: PIPELINE_STAGES.ATTACHMENTS.id,
    jaw: null,
    stageTitle: PIPELINE_STAGES.ATTACHMENTS.title,
    label: formatFallbackLabel(withoutExtension) || fileName,
    sortOrder: ATTACHMENT_FILE_ORDER.length,
    kind: 'attachment',
  };
};

/**
 * Stable identity for a run artifact (stage + jaw/attachment).
 * Used to skip re-downloading the same logical file during resume
 * while still accepting new downstream stage files.
 * Also keys local fileOverrides against backend downloads.
 */
export const getRunFileIdentityKey = (fileName = '') => {
  const parsed = parseRunFileName(fileName);

  if (parsed.kind === 'jaw' && parsed.pipelineStageId !== null && parsed.jaw) {
    return `jaw:${parsed.pipelineStageId}:${parsed.jaw}`;
  }
  if (parsed.kind === 'attachment') {
    return `attachment:${parsed.label || fileName}`;
  }
  if (parsed.kind === 'final') {
    return 'final:prong_placed';
  }
  return `file:${fileName}`;
};

const getFileExtension = (name = '') => {
  const lower = name.toLowerCase();
  if (lower.endsWith('.ply')) return 'ply';
  if (lower.endsWith('.stl')) return 'stl';
  return '';
};

const BACKEND_FILE_METADATA = Object.freeze({
  source: 'backend',
  status: 'normal',
});

const LOCAL_EDITED_METADATA = Object.freeze({
  source: 'local',
  status: 'edited',
  badge: 'Edited',
});

/**
 * Pure merge: backend downloads + local overrides → effectiveFiles.
 * Does not mutate inputs. Matching uses getRunFileIdentityKey / parseRunFileName
 * so Clean Maxilla never overrides Clean Mandible, Wall never overrides Blade, etc.
 *
 * @param {Array} downloadedFiles — immutable backend truth
 * @param {Record<string, { objectUrl: string, originalFile?: File, source?: string, createdAt?: number }>} fileOverrides
 * @returns {Array} effectiveFiles with metadata.source / metadata.status
 */
export const applyFileOverrides = (downloadedFiles = [], fileOverrides = {}) => {
  if (!downloadedFiles.length) return [];

  const hasOverrides =
    fileOverrides && Object.keys(fileOverrides).length > 0;

  return downloadedFiles.map((file) => {
    if (!hasOverrides) {
      return { ...file, metadata: BACKEND_FILE_METADATA };
    }

    const key = getRunFileIdentityKey(file.name);
    const override = fileOverrides[key];

    if (!override?.objectUrl) {
      return { ...file, metadata: BACKEND_FILE_METADATA };
    }

    const uploadName = override.originalFile?.name || file.name;

    return {
      ...file,
      objectUrl: override.objectUrl,
      extension: getFileExtension(uploadName) || file.extension,
      metadata: LOCAL_EDITED_METADATA,
    };
  });
};

/**
 * Builds override entries from a successful Replace dialog payload.
 * Keys are identity keys of the selected backend files being replaced.
 *
 * @param {Array} selectedFiles — Model Explorer selection at replace time
 * @param {{ maxilla?: File|null, mandible?: File|null, attachment?: File|null }} replacementFiles
 * @returns {Record<string, { objectUrl: string, originalFile: File, source: string, createdAt: number }>}
 */
export const buildFileOverridesFromReplace = (
  selectedFiles = [],
  replacementFiles = {}
) => {
  const overrides = {};

  selectedFiles.forEach((file) => {
    const parsed = parseRunFileName(file.name);
    let uploadFile = null;

    if (parsed.kind === 'jaw' && parsed.jaw === 'maxilla') {
      uploadFile = replacementFiles.maxilla ?? null;
    } else if (parsed.kind === 'jaw' && parsed.jaw === 'mandible') {
      uploadFile = replacementFiles.mandible ?? null;
    } else {
      uploadFile = replacementFiles.attachment ?? null;
    }

    if (!uploadFile) return;

    const key = getRunFileIdentityKey(file.name);
    overrides[key] = {
      objectUrl: URL.createObjectURL(uploadFile),
      originalFile: uploadFile,
      source: 'local',
      createdAt: Date.now(),
    };
  });

  return overrides;
};

/**
 * Stage eligibility for explorer group containers (not download scheduling).
 *
 * Download gating uses isArtifactEligible (progressStep < currentStep).
 * Empty groups still collapse via jaw-pair / attachment emptiness checks.
 *
 * Jaw stages (0–6): stageId <= currentStep
 * Attachments group: currentStep >= 7
 * Final group: currentStep >= 10
 */
export const isStageEligible = (
  stageId,
  { status, currentStep, resumeSessionActive: _resumeSessionActive = false } = {}
) => {
  // Terminal completion — including during an active resume session once
  // the regenerated run itself has finished.
  if (status === RUN_STATUS.DONE) return true;
  if (
    typeof currentStep === 'string' &&
    String(currentStep).toUpperCase() === 'DONE'
  ) {
    return true;
  }
  if (currentStep === null || currentStep === undefined) return false;

  const stepNum = Number(currentStep);
  if (Number.isNaN(stepNum)) return false;

  if (stageId === PIPELINE_STAGES.ATTACHMENTS.id) {
    return stepNum >= 7;
  }

  if (stageId === PIPELINE_STAGES.FINAL.id) {
    return stepNum >= 10;
  }

  return stageId <= stepNum;
};

/**
 * Backend progress index when an artifact may be downloaded / shown.
 * Matches resumeStep / current_step (0–10).
 */
export const getArtifactProgressStep = (fileName = '') => {
  const parsed = parseRunFileName(fileName);

  if (parsed.kind === 'jaw' && parsed.pipelineStageId !== null) {
    return parsed.pipelineStageId;
  }

  if (parsed.kind === 'final') return 10;

  if (parsed.kind === 'attachment') {
    if (parsed.label === 'Blade') return 8;
    if (parsed.label === 'Prong Engraved') return 9;
    return 7;
  }

  if (parsed.stepNumber !== null) return parsed.stepNumber;
  return Number.POSITIVE_INFINITY;
};

/**
 * Single-artifact eligibility for download + explorer rows.
 * files[] from the API is not filtered by current_step — this is.
 *
 * Backend semantics (confirmed): while status === "running", current_step is
 * the step that is CURRENTLY EXECUTING. Its files are written only after that
 * step finishes. A stage is therefore safe to download only when:
 *     progressStep < currentStep
 *
 * This rule is shared by the initial pipeline AND Retry/Replace resume.
 * Do NOT use <= — that would fetch the currently executing stage and can
 * permanently cache pre-overwrite bytes from the shared run directory.
 *
 * At terminal completion the backend reports status === "done" and/or
 * current_step === "DONE" (there is no step 11). That short-circuit allows
 * remaining artifacts — including final "prong_placed" (step 10).
 *
 * Hand-off after /resume: the previous run's status=done + full files[] may
 * still be mirrored for one render. useRunFiles blocks new downloads while
 * resumeTransition is true; this helper stays progressive-only.
 *
 * resumeSessionActive / resumeStep are accepted for call-site compatibility
 * but no longer change the comparison operator.
 */
export const isArtifactEligible = (
  fileName,
  {
    status = null,
    currentStep = null,
    resumeSessionActive: _resumeSessionActive = false,
    resumeStep: _resumeStep = null,
  } = {}
) => {
  const progressStep = getArtifactProgressStep(fileName);

  // Terminal completion — no step 11; allow any not-yet-downloaded artifact.
  if (status === RUN_STATUS.DONE) return true;
  if (
    typeof currentStep === 'string' &&
    String(currentStep).toUpperCase() === 'DONE'
  ) {
    return true;
  }
  if (currentStep === null || currentStep === undefined) return false;

  const stepNum = Number(currentStep);
  if (Number.isNaN(stepNum)) return false;

  // Running: only stages strictly before the currently executing step.
  return progressStep < stepNum;
};

/**
 * Visible Model Explorer groups = eligible stages ∩ eligible downloaded files.
 * Dedupes by logical identity so a run_id change cannot show Input twice.
 */
export const getVisibleRunFileGroups = (
  downloadedFiles = [],
  {
    status = null,
    currentStep = null,
    resumeSessionActive = false,
    resumeStep = null,
  } = {}
) => {
  const buckets = new Map(
    PIPELINE_STAGE_ORDER.map((stage) => [stage.id, []])
  );
  const seenIdentities = new Set();

  downloadedFiles.forEach((file) => {
    if (
      !isArtifactEligible(file.name, {
        status,
        currentStep,
        resumeSessionActive,
        resumeStep,
      })
    ) {
      return;
    }

    const identity = getRunFileIdentityKey(file.name);
    if (seenIdentities.has(identity)) return;
    seenIdentities.add(identity);

    const parsed = parseRunFileName(file.name);
    const bucket = buckets.get(parsed.pipelineStageId);
    if (!bucket) return;

    bucket.push({
      ...file,
      displayLabel: parsed.label,
      jaw: parsed.jaw,
      stepNumber: parsed.stepNumber,
      pipelineStageId: parsed.pipelineStageId,
      kind: parsed.kind,
      sortOrder: parsed.sortOrder ?? 0,
    });
  });

  return PIPELINE_STAGE_ORDER.map((stage) => {
    if (
      !isStageEligible(stage.id, {
        status,
        currentStep,
        resumeSessionActive,
      })
    ) {
      return null;
    }

    const bucketFiles = buckets.get(stage.id) || [];

    if (stage.id <= LAST_JAW_STAGE_ID) {
      const hasMaxilla = bucketFiles.some((f) => f.jaw === 'maxilla');
      const hasMandible = bucketFiles.some((f) => f.jaw === 'mandible');
      if (!hasMaxilla || !hasMandible) return null;

      const files = [...bucketFiles]
        .filter((f) => f.jaw === 'maxilla' || f.jaw === 'mandible')
        .sort((a, b) => (a.sortOrder ?? 2) - (b.sortOrder ?? 2));

      return { title: stage.title, files };
    }

    if (stage.id === PIPELINE_STAGES.ATTACHMENTS.id) {
      if (bucketFiles.length === 0) return null;

      const files = [...bucketFiles].sort(
        (a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99)
      );
      return { title: stage.title, files };
    }

    if (bucketFiles.length === 0) return null;
    const files = [...bucketFiles].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );
    return { title: stage.title, files };
  }).filter(Boolean);
};

/**
 * Legacy helper: groups downloaded files by stage without eligibility gating
 * beyond treating the run as complete. Prefer getVisibleRunFileGroups.
 */
export const groupRunFilesByStage = (files = []) =>
  getVisibleRunFileGroups(files, { status: RUN_STATUS.DONE });

/**
 * Short pipeline stage title for backend current_step (0–10).
 * Returns null when the step is unavailable.
 */
export const getPipelineStepTitle = (currentStep) => {
  if (currentStep === null || currentStep === undefined) return null;

  if (currentStep <= LAST_JAW_STAGE_ID) {
    const stage =
      PIPELINE_STAGE_ORDER.find((s) => s.id === currentStep) ||
      PIPELINE_STAGES.INPUT;
    return stage.title;
  }

  if (currentStep === 7) return 'Wall';
  if (currentStep === 8) return 'Blade';
  if (currentStep === 9) return 'Prong Engraved';
  if (currentStep >= 10) return 'Final Model';

  return null;
};

/**
 * Human-readable step line for the ResultViewer status badge.
 * Maps backend current_step (0–10) onto pipeline stage titles.
 */
export const getGeneratingStepLabel = (currentStep) => {
  const title = getPipelineStepTitle(currentStep);
  return title ? `Generating ${title}...` : null;
};

/**
 * Derived ResultViewer header badge — driven by pipeline status + download
 * readiness, not viewer open readiness alone.
 *
 * @returns {{ tone: 'waiting'|'progress'|'success'|'error', label: string, detail: string|null }}
 */
export const getResultStatusBadge = ({
  status = null,
  currentStep = null,
  resumeSessionActive = false,
  resumeStageTitle = null,
  isResuming = false,
  hasRunId = false,
  downloadsReady = false,
} = {}) => {
  const stepDetail = getGeneratingStepLabel(currentStep);
  const lifecycle = deriveRunLifecycle(status);
  const inResumeFlow =
    isResuming || resumeSessionActive || Boolean(resumeStageTitle);
  const waitingOnDownloads = lifecycle.completed && !downloadsReady;

  if (lifecycle.failed) {
    return {
      tone: 'error',
      label: inResumeFlow ? 'Resume Failed' : 'Generation Failed',
      detail: null,
    };
  }

  const regenerating =
    isResuming ||
    resumeSessionActive ||
    (resumeStageTitle && !lifecycle.completed);

  if (
    isResuming ||
    resumeSessionActive ||
    lifecycle.processing ||
    waitingOnDownloads
  ) {
    if (regenerating || resumeStageTitle) {
      return {
        tone: 'progress',
        label: resumeStageTitle
          ? `Regenerating from ${resumeStageTitle}...`
          : 'Regenerating...',
        detail: waitingOnDownloads
          ? 'Downloading regenerated models...'
          : stepDetail,
      };
    }

    return {
      tone: 'progress',
      label: 'AI Generation In Progress',
      detail: waitingOnDownloads ? 'Downloading models...' : stepDetail,
    };
  }

  if (lifecycle.completed && downloadsReady) {
    return {
      tone: 'success',
      label: resumeStageTitle ? 'Resume Complete' : 'AI Generation Complete',
      detail: null,
    };
  }

  if (hasRunId) {
    return {
      tone: 'progress',
      label: 'AI Generation In Progress',
      detail: stepDetail || 'Starting AI generation...',
    };
  }

  return {
    tone: 'waiting',
    label: 'Waiting for AI Output',
    detail: null,
  };
};
