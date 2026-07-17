import { useEffect, useMemo, useRef, useState } from 'react';
import { LOADING_MILESTONES } from '../constants';
import {
  getLoadingMilestone,
  getVisibleRunFileGroups,
  isViewerReady,
} from '../utils';

/**
 * Derives backend loading-screen state, viewer transition readiness,
 * and progressive Model Explorer visibility.
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

  // Latest preserve flag for runId transitions — must not be an effect dep,
  // or ending a resume (true→false) would hide/unmount the live viewer.
  const preserveViewerRef = useRef(preserveViewer);
  preserveViewerRef.current = preserveViewer;

  // Reset open sequence only on a genuine runId change (fresh upload / Start Over).
  // Skip when that runId switch is a preserved resume hand-off.
  useEffect(() => {
    if (preserveViewerRef.current) return;
    setForceOpening(false);
    setCanRevealViewer(false);
  }, [runId]);

  // Files ready → 85% frame → 100% frame → reveal (no artificial delay).
  useEffect(() => {
    if (!filesReady) {
      // Keep the viewer up during resume even if readiness flickers.
      if (preserveViewer) return undefined;

      setForceOpening(false);
      setCanRevealViewer(false);
      return undefined;
    }

    let cancelled = false;
    let outerRaf = 0;
    let innerRaf = 0;

    outerRaf = window.requestAnimationFrame(() => {
      if (cancelled) return;
      setForceOpening(true);

      innerRaf = window.requestAnimationFrame(() => {
        if (cancelled) return;
        setCanRevealViewer(true);
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(outerRaf);
      window.cancelAnimationFrame(innerRaf);
    };
  }, [filesReady, preserveViewer]);

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

  const [displayProgress, setDisplayProgress] = useState(
    LOADING_MILESTONES.PREPARING.progress
  );

  useEffect(() => {
    setDisplayProgress(milestone.progressPercentage);
  }, [milestone.progressPercentage]);

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
    progressPercentage: displayProgress,
    loadingMessage: milestone.loadingMessage,
    milestoneId: milestone.milestoneId,
    filesReady,
    viewerReady: canRevealViewer,
    visibleGroups,
    visibleFileCount,
  };
};

export default useRunLoadingState;
