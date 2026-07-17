import { useEffect, useRef, useState } from 'react';
import { getRun } from '../../../api/runs';
import { RUN_STATUS, isTerminalStatus } from '../runLifecycle';

const POLL_INTERVAL_MS = 2000;

const isMissingStep = (step) => step === null || step === undefined;

/**
 * Polls GET /runs/{run_id} every 2s using setTimeout chaining (not
 * setInterval), so a slow request never overlaps with the next poll.
 *
 * Stops polling when status is "done"/"failed", or on unmount.
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

  const timeoutIdRef = useRef(null);
  const abortControllerRef = useRef(null);
  const stoppedRef = useRef(false);
  const preserveRef = useRef(preserveStateOnRunChange);
  preserveRef.current = preserveStateOnRunChange;
  const seedStepRef = useRef(seedCurrentStep);
  seedStepRef.current = seedCurrentStep;

  useEffect(() => {
    if (preserveRef.current) {
      // Optimistic resume progress — never inherit previous status=done.
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

    if (!runId) {
      setIsPolling(false);
      return;
    }

    stoppedRef.current = false;
    setIsPolling(true);

    const scheduleNextPoll = () => {
      if (stoppedRef.current) return;
      timeoutIdRef.current = window.setTimeout(poll, POLL_INTERVAL_MS);
    };

    async function poll() {
      if (stoppedRef.current) return;

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const run = await getRun(runId, { signal: controller.signal });
        if (stoppedRef.current) return;

        setStatus(run.status);
        setCurrentStep((prev) => {
          // Resume only: backend may briefly report null — keep seed / last step.
          if (preserveRef.current && isMissingStep(run.current_step)) {
            return prev;
          }
          return run.current_step;
        });
        setFiles(run.files || []);
        setError(null);

        if (isTerminalStatus(run.status)) {
          stoppedRef.current = true;
          setIsPolling(false);
          return;
        }

        scheduleNextPoll();
      } catch (err) {
        if (err?.name === 'AbortError' || stoppedRef.current) return;

        setError(
          err instanceof Error ? err.message : 'Failed to fetch run status.'
        );
        scheduleNextPoll();
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
  };
};

export default useRunPolling;
