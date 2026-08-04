/**
 * Run lifecycle derived from backend GET /runs/{id} `status`.
 * useRunPolling is the source of truth; consumers should read this helper
 * instead of comparing status strings inline.
 */

export const RUN_STATUS = {
  QUEUED: 'queued',
  PENDING: 'pending',
  RUNNING: 'running',
  DONE: 'done',
  FAILED: 'failed',
};

const PROCESSING_STATUSES = new Set([
  RUN_STATUS.QUEUED,
  RUN_STATUS.PENDING,
  RUN_STATUS.RUNNING,
]);

const TERMINAL_STATUSES = new Set([RUN_STATUS.DONE, RUN_STATUS.FAILED]);

export const isTerminalStatus = (status) => TERMINAL_STATUSES.has(status);

export const isProcessingStatus = (status) => PROCESSING_STATUSES.has(status);

/**
 * @param {string|null|undefined} status
 * @returns {{
 *   status: string|null|undefined,
 *   processing: boolean,
 *   settled: boolean,
 *   failed: boolean,
 *   completed: boolean,
 * }}
 */
export const deriveRunLifecycle = (status) => {
  const failed = status === RUN_STATUS.FAILED;
  const completed = status === RUN_STATUS.DONE;
  const settled = failed || completed;
  const processing = isProcessingStatus(status);

  return {
    status,
    processing,
    settled,
    failed,
    completed,
  };
};

/**
 * True when the run is settled (done/failed).
 * Used for nav lock (Go Back / Go Home) while a pipeline is active.
 * Retry/Replace are NOT gated on this — mid-pipeline resume is allowed.
 */
export const canMutateRun = (status) => deriveRunLifecycle(status).settled;
