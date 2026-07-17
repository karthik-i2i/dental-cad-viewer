export const STL_FILES = [
  { id: 1, name: "Input Maxilla", path: "/models/su31626_step_00_input_maxilla.ply" },
  { id: 2, name: "Input Mandible", path: "/models/su31626_step_00_input_mandible.ply" },
  { id: 3, name: "Reoriented Maxilla", path: "/models/su31626_step_01_reoriented_maxilla.ply" },
  { id: 4, name: "Reoriented Mandible", path: "/models/su31626_step_01_reoriented_mandible.ply" },
  { id: 5, name: "Clean Maxilla", path: "/models/su31626_step_02_clean_maxilla.stl" },
  { id: 6, name: "Clean Mandible", path: "/models/su31626_step_02_clean_mandible.stl" },
  { id: 7, name: "Teeth removed Maxilla", path: "/models/su31626_step_03_teeth_removed_maxilla.ply" },
  { id: 8, name: "Teeth removed Mandible", path: "/models/su31626_step_03_teeth_removed_mandible.ply" },
  { id: 9, name: "Trimmed Maxilla", path: "/models/su31626_step_04_trimmed_maxilla.stl" },
  { id: 10, name: "Trimmed Mandible", path: "/models/su31626_step_04_trimmed_mandible.stl" },
  { id: 11, name: "Hollow Maxilla", path: "/models/su31626_step_05_hollow_maxilla.stl" },
  { id: 12, name: "Hollow Mandible", path: "/models/su31626_step_05_hollow_mandible.stl" },
  { id: 13, name: "Solid Maxilla", path: "/models/su31626_step_06_solid_maxilla.stl" },
  { id: 14, name: "Solid Mandible", path: "/models/su31626_step_06_solid_mandible.stl" },
  { id: 15, name: "Wall attached", path: "/models/su31626_step_07_wall.stl" },
  { id: 16, name: "Blade attached", path: "/models/su31626_step_08_blade.stl" },
  { id: 17, name: "Prong engraved", path: "/models/su31626_step_09_prong_engraved.stl" },
  { id: 18, name: "Prong attached", path: "/models/su31626_step_10_prong_placed.stl" }
];

export const MODEL_GROUPS = [
  {
    title: 'Input',
    ids: [1, 2],
  },
  {
    title: 'Reoriented',
    ids: [3, 4],
  },
  {
    title: 'Clean',
    ids: [5, 6],
  },
  {
    title: 'Teeth Removed',
    ids: [7, 8],
  },
  {
    title: 'Trimmed',
    ids: [9, 10],
  },
  {
    title: 'Hollow',
    ids: [11, 12],
  },
  {
    title: 'Solid',
    ids: [13, 14],
  },
  {
    title: 'Final Assembly',
    ids: [15, 16, 17, 18],
  },
];

export const SHIELD_LABELS = {
  lat_left: 'Lateral Left',
  lat_right: 'Lateral Right',
  depress: 'Depress',
  elevate: 'Elevate',
};

/**
 * Canonical backend pipeline stages.
 * Stage ids match backend `current_step` and filename `step_XX` for 0–6.
 * Attachments/Final (7–8) span multiple filenames — Phase 2 grouping.
 */
export const PIPELINE_STAGES = {
  INPUT: { id: 0, title: 'Input' },
  REORIENTED: { id: 1, title: 'Reoriented' },
  CLEAN: { id: 2, title: 'Clean' },
  TEETH_REMOVED: { id: 3, title: 'Teeth Removed' },
  TRIMMED: { id: 4, title: 'Trimmed' },
  HOLLOW: { id: 5, title: 'Hollow' },
  SOLID: { id: 6, title: 'Solid' },
  ATTACHMENTS: { id: 7, title: 'Attachments' },
  FINAL: { id: 8, title: 'Final' },
};

/** Ordered pipeline list for explorer grouping. */
export const PIPELINE_STAGE_ORDER = [
  PIPELINE_STAGES.INPUT,
  PIPELINE_STAGES.REORIENTED,
  PIPELINE_STAGES.CLEAN,
  PIPELINE_STAGES.TEETH_REMOVED,
  PIPELINE_STAGES.TRIMMED,
  PIPELINE_STAGES.HOLLOW,
  PIPELINE_STAGES.SOLID,
  PIPELINE_STAGES.ATTACHMENTS,
  PIPELINE_STAGES.FINAL,
];

/** Last jaw-pair stage id (Input…Solid). */
export const LAST_JAW_STAGE_ID = PIPELINE_STAGES.SOLID.id;

/**
 * Attachments within the Attachments group.
 * `match` is tested in array order (wall_fill_only before wall).
 * `order` is the display sort within the group.
 */
export const ATTACHMENT_FILE_ORDER = [
  { match: /wall_fill_only/, label: 'Wall Fill Only', order: 1 },
  { match: /wall/, label: 'Wall', order: 0 },
  { match: /blade/, label: 'Blade', order: 2 },
  { match: /prong_engraved/, label: 'Prong Engraved', order: 3 },
];

/** Final-stage file matchers (lowercase filename). */
export const FINAL_FILE_MATCHERS = [
  { match: /prong_placed/, label: 'Prong Placed' },
  { match: /prong_attached/, label: 'Prong Placed' },
];

/**
 * Selection modes for Retry / Replace.
 * - none:   actions disabled for this stage
 * - jaw:    one or both jaws from the same stage
 * - single: exactly one attachment file
 */
export const SELECTION_MODE = {
  NONE: 'none',
  JAW: 'jaw',
  SINGLE: 'single',
};

/**
 * Central capability map for Retry / Replace.
 * Future resume/replace phases should read this instead of adding conditionals.
 *
 * resumeStep: backend resume step index (2–9), or null when unsupported.
 */
export const PIPELINE_STAGE_ACTIONS = {
  input: {
    title: 'Input',
    retry: false,
    replace: false,
    selection: SELECTION_MODE.NONE,
    resumeStep: null,
  },
  reoriented: {
    title: 'Reoriented',
    retry: false,
    replace: false,
    selection: SELECTION_MODE.NONE,
    resumeStep: null,
  },
  clean: {
    title: 'Clean',
    retry: true,
    replace: true,
    selection: SELECTION_MODE.JAW,
    resumeStep: 2,
  },
  teethRemoved: {
    title: 'Teeth Removed',
    retry: true,
    replace: true,
    selection: SELECTION_MODE.JAW,
    resumeStep: 3,
  },
  trimmed: {
    title: 'Trimmed',
    retry: true,
    replace: true,
    selection: SELECTION_MODE.JAW,
    resumeStep: 4,
  },
  hollow: {
    title: 'Hollow',
    retry: true,
    replace: true,
    selection: SELECTION_MODE.JAW,
    resumeStep: 5,
  },
  solid: {
    title: 'Solid',
    retry: true,
    replace: true,
    selection: SELECTION_MODE.JAW,
    resumeStep: 6,
  },
  wall: {
    title: 'Wall',
    retry: true,
    replace: true,
    selection: SELECTION_MODE.SINGLE,
    resumeStep: 7,
  },
  wallFillOnly: {
    title: 'Wall Fill Only',
    retry: true,
    replace: true,
    selection: SELECTION_MODE.SINGLE,
    resumeStep: 7,
  },
  blade: {
    title: 'Blade',
    retry: true,
    replace: true,
    selection: SELECTION_MODE.SINGLE,
    resumeStep: 8,
  },
  prongEngraved: {
    title: 'Prong Engraved',
    retry: true,
    replace: true,
    selection: SELECTION_MODE.SINGLE,
    resumeStep: 9,
  },
  prongPlaced: {
    title: 'Prong Placed',
    retry: false,
    replace: false,
    selection: SELECTION_MODE.NONE,
    resumeStep: null,
  },
};

/** Map pipeline stage id (0–6) → PIPELINE_STAGE_ACTIONS key. */
export const JAW_STAGE_ACTION_KEYS = {
  [PIPELINE_STAGES.INPUT.id]: 'input',
  [PIPELINE_STAGES.REORIENTED.id]: 'reoriented',
  [PIPELINE_STAGES.CLEAN.id]: 'clean',
  [PIPELINE_STAGES.TEETH_REMOVED.id]: 'teethRemoved',
  [PIPELINE_STAGES.TRIMMED.id]: 'trimmed',
  [PIPELINE_STAGES.HOLLOW.id]: 'hollow',
  [PIPELINE_STAGES.SOLID.id]: 'solid',
};

/** Map attachment display label → PIPELINE_STAGE_ACTIONS key. */
export const ATTACHMENT_ACTION_KEYS = {
  'Wall Fill Only': 'wallFillOnly',
  Wall: 'wall',
  Blade: 'blade',
  'Prong Engraved': 'prongEngraved',
};

/** User-facing tooltips for Retry / Replace disabled states. */
export const RETRY_REPLACE_TOOLTIPS = {
  NO_SELECTION: 'Select a file to continue.',
  EARLY_STAGE:
    'Retry and Replace are available only from Clean and later stages.',
  MIXED_STAGES: 'Select files from the same stage.',
  MULTIPLE_ATTACHMENTS: 'Select only one attachment.',
  TOO_MANY: 'Select one or two valid files.',
  FINAL: 'This is the final output and cannot be retried or replaced.',
  VIEWER_NOT_READY: 'Wait for the model to finish loading.',
  PROCESSING: 'Processing is already running.',
  RESUME_IN_FLIGHT: 'Resume is already in progress.',
};

/** Backend `current_step` at/above this means Input + Reoriented are done. */
export const VIEWER_BACKEND_READY_STEP = PIPELINE_STAGES.CLEAN.id;

/**
 * Filename-parsed files required before dismissing the loading screen.
 * Identified by stage id + jaw — never by download order or file count.
 */
export const VIEWER_REQUIRED_FILES = [
  { stageId: PIPELINE_STAGES.INPUT.id, jaw: 'maxilla' },
  { stageId: PIPELINE_STAGES.INPUT.id, jaw: 'mandible' },
  { stageId: PIPELINE_STAGES.REORIENTED.id, jaw: 'maxilla' },
  { stageId: PIPELINE_STAGES.REORIENTED.id, jaw: 'mandible' },
];

/**
 * Workflow milestones toward opening the ResultViewer.
 * Progress reflects frontend readiness, not exact backend stage %.
 */
export const LOADING_MILESTONES = {
  PREPARING: {
    id: 'preparing',
    progress: 15,
    message: 'Preparing your design...',
  },
  ACCEPTED: {
    id: 'accepted',
    progress: 35,
    message: 'Starting AI generation...',
  },
  GENERATING: {
    id: 'generating',
    progress: 65,
    message: 'Building your first models...',
  },
  FILES_READY: {
    id: 'files_ready',
    progress: 85,
    message: 'Preparing your viewer...',
  },
  OPENING: {
    id: 'opening',
    progress: 100,
    message: 'Opening viewer...',
  },
};

/** CSS / perceived progress animation between milestones (ms). */
export const LOADING_PROGRESS_TRANSITION_MS = 450;

/**
 * Demo/legacy timer progress only (useProgressSimulation).
 * Not used by the backend loading path.
 */
export const PROGRESS_STEPS = [
  {
    label: 'Segmenting Mandible (Input)',
    progress: 8,
  },
  {
    label: 'Segmenting Maxilla (Input)',
    progress: 16,
  },
  {
    label: 'Reorienting Scans',
    progress: 21,
  },
  {
    label: 'Segmenting Mandible (Reoriented)',
    progress: 29,
  },
  {
    label: 'Segmenting Maxilla (Reoriented)',
    progress: 37,
  },
  {
    label: 'Preparing Boundary Data',
    progress: 40,
  },
  {
    label: 'Removing Scan Artifacts',
    progress: 45,
  },
  {
    label: 'Removing Teeth',
    progress: 50,
  },
  {
    label: 'Trimming Scan',
    progress: 55,
  },
  {
    label: 'Generating Splint Surface',
    progress: 65,
  },
  {
    label: 'Building Solid Splint',
    progress: 75,
  },
  {
    label: 'Building Wall Segment',
    progress: 85,
  },
  {
    label: 'Placing Tongue Blade',
    progress: 90,
  },
  {
    label: 'Engraving Prong',
    progress: 97,
  },
  {
    label: 'Placing Prong',
    progress: 99,
  },
  {
    label: 'Finalizing Output',
    progress: 100,
  },
];