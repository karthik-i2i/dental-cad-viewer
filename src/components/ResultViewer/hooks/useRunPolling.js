import { useEffect, useRef, useState } from 'react';
import { getRun } from '../../../api/runs';
import { RUN_STATUS, isTerminalStatus } from '../runLifecycle';

const POLL_INTERVAL_MS = 2000;
const POLL_RETRY_INTERVAL_MS = 30000;
const CONNECTION_FAILURE_THRESHOLD = 10;

const isMissingStep = (step) => step === null || step === undefined;

/**
 * Polls GET /runs/{run_id} using setTimeout chaining (not setInterval),
 * so a slow request never overlaps with the next poll.
 *
 * Healthy backend: every 2s. After 10 consecutive connection failures:
 * mark connectionLost and slow to 30s. Any successful poll resets both.
 * AbortError does not count as a failure and does not reschedule.
 *
 * Stops polling when status is "done"/"failed", or on unmount.
 * On Resume, activeRunId switches to a NEW run_id — this effect remounts,
 * aborts the previous poll, and seeds running + seedCurrentStep.
 *
 * confirmedPollSnapshot is written only after a successful GET that survives
 * stale-response guards. It is never populated from optimistic seed, poll
 * start, errors, or aborts. Resume hand-off ends when its runId matches
 * the active run (shared run_dir may return a full files[] immediately).
 *
 * @param {string|null} runId
 * @param {{
 *   preserveStateOnRunChange?: boolean,
 *   seedCurrentStep?: number|null,
 * }} [options]
 *
 * On resume run_id switch with preserveStateOnRunChange:
 * - Do NOT keep status === 'done' (that re-expands stale explorer stages).
 * - Seed status=running + current_step=seedCurrentStep (caller passes
 *   resumeStep + 1 so the retried stage stays eligible under
 *   progressStep < currentStep).
 * - While preserve is active, ignore temporary backend current_step=null
 *   and keep the last numeric step (seed or later poll). Initial runs
 *   (preserve=false) still treat null normally.
 * - Clear files[] so old download_urls are not reused; useRunFiles keeps
 *   upstream blobs via preserveCache.
 * - Reset confirmedPollSnapshot to null until the first real GET succeeds.
 */
const useRunPolling = (runId, options = {}) => {
  const {
    preserveStateOnRunChange = false,
    seedCurrentStep = null,
  } = options;

  const [status, setStatus] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  // Atomic confirmed GET payload — null until a real poll commits for runId.
  const [confirmedPollSnapshot, setConfirmedPollSnapshot] = useState(null);

  const timeoutIdRef = useRef(null);
  const abortControllerRef = useRef(null);
  const stoppedRef = useRef(false);
  const consecutiveFailuresRef = useRef(0);
  const preserveRef = useRef(preserveStateOnRunChange);
  preserveRef.current = preserveStateOnRunChange;
  const seedStepRef = useRef(seedCurrentStep);
  seedStepRef.current = seedCurrentStep;
  // Latest committed step for preserve-null resolution in the success path.
  const currentStepRef = useRef(currentStep);
  currentStepRef.current = currentStep;

  useEffect(() => {
    // New runId (or clear): drop confirmation until a real GET succeeds.
    setConfirmedPollSnapshot(null);

    if (preserveRef.current) {
      // Optimistic resume progress — never inherit previous status=done.
      // Does NOT write confirmedPollSnapshot.
      setStatus(RUN_STATUS.RUNNING);
      setCurrentStep(
        isMissingStep(seedStepRef.current) ? null : seedStepRef.current
      );
      setFiles([]);
    } else {
      setStatus(null);
      setCurrentStep(null);
      setFiles([]);
    }
    setError(null);
    consecutiveFailuresRef.current = 0;
    setConnectionLost(false);

    if (!runId) {
      setIsPolling(false);
      return;
    }

    stoppedRef.current = false;
    setIsPolling(true);

    const scheduleNextPoll = (intervalMs = POLL_INTERVAL_MS) => {
      if (stoppedRef.current) return;
      timeoutIdRef.current = window.setTimeout(poll, intervalMs);
    };

    async function poll() {
      if (stoppedRef.current) return;

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const run = await getRun(runId, { signal: controller.signal });
        if (stoppedRef.current) return;

        consecutiveFailuresRef.current = 0;
        setConnectionLost(false);

        const nextStatus = run.status;
        const nextCurrentStep =
          preserveRef.current && isMissingStep(run.current_step)
            ? currentStepRef.current
            : run.current_step;
        const nextFiles = run.files || [];

        // Commit live poll fields and confirmation atomically (one batch).
        setStatus(nextStatus);
        setCurrentStep(nextCurrentStep);
        setFiles(nextFiles);
        setConfirmedPollSnapshot({
          runId,
          status: nextStatus,
          currentStep: nextCurrentStep,
          files: nextFiles,
        });
        setError(null);

        if (isTerminalStatus(run.status)) {
          stoppedRef.current = true;
          setIsPolling(false);
          return;
        }

        scheduleNextPoll(POLL_INTERVAL_MS);
      } catch (err) {
        if (err?.name === 'AbortError' || stoppedRef.current) return;

        consecutiveFailuresRef.current += 1;
        const lost =
          consecutiveFailuresRef.current >= CONNECTION_FAILURE_THRESHOLD;
        if (lost) {
          setConnectionLost(true);
        }

        setError(
          err instanceof Error ? err.message : 'Failed to fetch run status.'
        );
        scheduleNextPoll(
          lost ? POLL_RETRY_INTERVAL_MS : POLL_INTERVAL_MS
        );
      }
    }

    poll();

    return () => {
      stoppedRef.current = true;
      setIsPolling(false);
      if (timeoutIdRef.current) {
        window.clearTimeout(timeoutIdRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [runId]);

  return {
    status,
    currentStep,
    files,
    error,
    isPolling,
    connectionLost,
    confirmedPollSnapshot,
  };
};

export default useRunPolling;
