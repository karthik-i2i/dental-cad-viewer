import { useEffect, useMemo, useRef, useState } from 'react';
import { getDisplayCheckpoint } from '../displayProgress';

/**
 * Per-frame distance-based easing:
 *   display += (target - display) * EASING_FACTOR
 * Higher = snappier approach. Tune freely.
 */
export const DISPLAY_EASING_FACTOR = 0.08;

/**
 * Presentation-only loading bar animation.
 *
 * Eases displayPercent toward the current checkpoint: floor first (when
 * below it), then softCeiling. Never snaps/teleports to a new floor.
 * Never exceeds softCeiling; never moves backwards within a run.
 * Does not touch viewerReady, filesReady, reveal timers, polling, or downloads.
 *
 * Multi-checkpoint backend jumps animate toward the *current* checkpoint
 * floor only — intermediate floors are not visited.
 *
 * @param {{
 *   enabled?: boolean,
 *   resetKey?: string|null,
 *   hasRunId?: boolean,
 *   status?: string|null,
 *   currentStep?: string|number|null,
 *   filesReady?: boolean,
 *   milestoneId?: string|null,
 * }} options
 */
const useDisplayProgress = ({
  enabled = false,
  resetKey = null,
  hasRunId = false,
  status = null,
  currentStep = null,
  filesReady = false,
  milestoneId = null,
} = {}) => {
  const [displayPercent, setDisplayPercent] = useState(0);

  const displayRef = useRef(0);
  const enabledRef = useRef(enabled);
  const bandRef = useRef({
    floor: 0,
    ceiling: 15,
    softCeiling: 15,
  });
  const rafRef = useRef(null);

  const checkpoint = useMemo(
    () =>
      getDisplayCheckpoint({
        hasRunId,
        status,
        currentStep,
        filesReady,
        milestoneId,
      }),
    [hasRunId, status, currentStep, filesReady, milestoneId]
  );

  // New run → restart display at 0 (before band sync below).
  useEffect(() => {
    displayRef.current = 0;
    setDisplayPercent(0);
  }, [resetKey]);

  // Sync checkpoint band only — rAF eases up to floor, then softCeiling.
  useEffect(() => {
    const softCeiling = Math.min(checkpoint.softCeiling, checkpoint.ceiling);
    bandRef.current = {
      floor: checkpoint.floor,
      ceiling: checkpoint.ceiling,
      softCeiling,
    };
  }, [
    checkpoint.id,
    checkpoint.floor,
    checkpoint.ceiling,
    checkpoint.softCeiling,
  ]);

  useEffect(() => {
    enabledRef.current = enabled;

    if (!enabled) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return undefined;
    }

    const tick = () => {
      if (!enabledRef.current) {
        rafRef.current = null;
        return;
      }

      const { floor, softCeiling } = bandRef.current;
      let next = displayRef.current;

      // Below floor → ease to floor; once there → ease to softCeiling.
      const target = next < floor ? floor : softCeiling;

      if (next < target) {
        next += (target - next) * DISPLAY_EASING_FACTOR;
        if (target - next < 0.01) {
          next = target;
        }
        if (next > target) {
          next = target;
        }
      }

      // Never exceed the current checkpoint soft fill bound.
      if (next > softCeiling) {
        next = softCeiling;
      }

      // Monotonic within a run.
      if (next < displayRef.current) {
        next = displayRef.current;
      }

      if (next !== displayRef.current) {
        displayRef.current = next;
        setDisplayPercent(next);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled, resetKey]);

  return {
    displayPercent: enabled ? displayPercent : 0,
    checkpointId: checkpoint.id,
  };
};

export default useDisplayProgress;
