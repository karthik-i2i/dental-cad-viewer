import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LOADING_FILES_READY_HOLD_MS,
  LOADING_REVEAL_HOLD_MS,
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
 * ProgressState provides a shimmer so the UI still feels alive.
 *
 * @param {{ preserveViewer?: boolean }} When true (resume transition),
 *   do not collapse back to the loading screen on runId change.
 */
const useRunLoadingState = ({
  runId,
  status,
  currentStep,
  downloadedFiles,
  preserveViewer = false,
  resumeSessionActive = false,
  resumeStep = null,
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

  // After OPENING (100%), hold so the user sees completion, then reveal.
  useEffect(() => {
    if (preserveViewer) return undefined;
    if (!filesReady || !forceOpening || canRevealViewer) return undefined;

    const revealTimer = window.setTimeout(() => {
      setCanRevealViewer(true);
    }, LOADING_REVEAL_HOLD_MS);

    return () => {
      window.clearTimeout(revealTimer);
    };
  }, [filesReady, forceOpening, canRevealViewer, preserveViewer]);

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
