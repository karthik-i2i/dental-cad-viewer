import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LOADING_COMPLETE_HOLD_MS,
  LOADING_FILES_READY_HOLD_MS,
} from '../constants';
import {
  getLoadingMilestone,
  getVisibleRunFileGroups,
  isViewerReady,
} from '../utils';

/**
 * Derives backend loading-screen state, viewer transition readiness,
 * and progressive Model Explorer visibility.
 *
 * Progress % tracks milestone values only (15 / 35 / 65 / 85 / 100).
 * No fabricated in-between percentages — the bar stays put during waits;
 * ProgressState / useDisplayProgress provide soft-fill motion.
 *
 * Reveal hold (LOADING_COMPLETE_HOLD_MS) starts only after displayComplete
 * — i.e. the visible bar has reached 100% — not when forceOpening flips.
 *
 * @param {{
 *   preserveViewer?: boolean,
 *   displayComplete?: boolean,
 * }} When preserveViewer is true (resume), do not collapse back to the
 *   loading screen on runId change. displayComplete comes from
 *   useDisplayProgress (visible bar at 100%).
 */
const useRunLoadingState = ({
  runId,
  status,
  currentStep,
  downloadedFiles,
  preserveViewer = false,
  resumeSessionActive = false,
  resumeStep = null,
  displayComplete = false,
}) => {
  const filesReady = useMemo(
    () => isViewerReady(downloadedFiles),
    [downloadedFiles]
  );

  const [forceOpening, setForceOpening] = useState(false);
  const [canRevealViewer, setCanRevealViewer] = useState(false);

  const preserveViewerRef = useRef(preserveViewer);
  preserveViewerRef.current = preserveViewer;

  // Fresh run only — never collapse the viewer when a resume session ends.
  useEffect(() => {
    if (preserveViewerRef.current) return;
    setForceOpening(false);
    setCanRevealViewer(false);
  }, [runId]);

  /**
   * filesReady → show FILES_READY (85%) briefly, then OPENING (100%).
   * Percentage jumps only at those milestone changes (CSS eases the width).
   */
  useEffect(() => {
    if (!filesReady) {
      if (preserveViewer) return undefined;
      setForceOpening(false);
      setCanRevealViewer(false);
      return undefined;
    }

    // Resume: viewer already up — do not re-enter the loading reveal sequence.
    if (preserveViewer) return undefined;

    setForceOpening(false);

    const openTimer = window.setTimeout(() => {
      setForceOpening(true);
    }, LOADING_FILES_READY_HOLD_MS);

    return () => {
      window.clearTimeout(openTimer);
    };
  }, [filesReady, preserveViewer]);

  // Hold at visible 100%, then reveal. Do not start from forceOpening alone —
  // displayPercent must finish easing to 100 first (displayComplete).
  useEffect(() => {
    if (preserveViewer) return undefined;
    if (
      !filesReady ||
      !forceOpening ||
      !displayComplete ||
      canRevealViewer
    ) {
      return undefined;
    }

    const revealTimer = window.setTimeout(() => {
      setCanRevealViewer(true);
    }, LOADING_COMPLETE_HOLD_MS);

    return () => {
      window.clearTimeout(revealTimer);
    };
  }, [
    filesReady,
    forceOpening,
    displayComplete,
    canRevealViewer,
    preserveViewer,
  ]);

  const milestone = useMemo(
    () =>
      getLoadingMilestone({
        hasRunId: Boolean(runId),
        status,
        currentStep,
        filesReady,
        forceOpening,
      }),
    [runId, status, currentStep, filesReady, forceOpening]
  );

  const visibleGroups = useMemo(
    () =>
      getVisibleRunFileGroups(downloadedFiles, {
        status,
        currentStep,
        resumeSessionActive,
        resumeStep,
      }),
    [
      downloadedFiles,
      status,
      currentStep,
      resumeSessionActive,
      resumeStep,
    ]
  );

  const visibleFileCount = useMemo(
    () => visibleGroups.reduce((sum, group) => sum + group.files.length, 0),
    [visibleGroups]
  );

  return {
    progressPercentage: milestone.progressPercentage,
    loadingMessage: milestone.loadingMessage,
    milestoneId: milestone.milestoneId,
    filesReady,
    viewerReady: canRevealViewer,
    visibleGroups,
    visibleFileCount,
  };
};

export default useRunLoadingState;
