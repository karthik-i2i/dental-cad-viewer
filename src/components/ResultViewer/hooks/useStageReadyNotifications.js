import { useEffect, useRef, useState } from 'react';
import { PIPELINE_STAGES } from '../constants';

/** Stages that unlock the viewer — toasting them is noise. */
const SKIP_STAGE_TITLES = new Set([
  PIPELINE_STAGES.INPUT.title,
  PIPELINE_STAGES.REORIENTED.title,
]);

const STAGE_TITLE_TO_KEY = {
  [PIPELINE_STAGES.INPUT.title]: 'stage:input',
  [PIPELINE_STAGES.REORIENTED.title]: 'stage:reoriented',
  [PIPELINE_STAGES.CLEAN.title]: 'stage:clean',
  [PIPELINE_STAGES.TEETH_REMOVED.title]: 'stage:teeth_removed',
  [PIPELINE_STAGES.TRIMMED.title]: 'stage:trimmed',
  [PIPELINE_STAGES.HOLLOW.title]: 'stage:hollow',
  [PIPELINE_STAGES.SOLID.title]: 'stage:solid',
  [PIPELINE_STAGES.FINAL.title]: 'stage:final',
};

/** Attachment labels that emit a ready toast. Wall Fill Only is intentionally omitted. */
const ATTACHMENT_LABEL_TO_KEY = {
  Wall: 'attachment:wall',
  Blade: 'attachment:blade',
  'Prong Engraved': 'attachment:prong_engraved',
};

const NOTIFICATION_COPY = {
  'stage:clean': 'Clean stage is ready',
  'stage:teeth_removed': 'Teeth Removed stage is ready',
  'stage:trimmed': 'Trimmed stage is ready',
  'stage:hollow': 'Hollow stage is ready',
  'stage:solid': 'Solid stage is ready',
  'attachment:wall': 'Wall stage is ready',
  'attachment:blade': 'Blade stage is ready',
  'attachment:prong_engraved': 'Prong Engraved stage is ready',
  'stage:final': 'AI Generation Complete',
};

/**
 * Derive stable ready-keys from the same visibleGroups that drive Model Explorer.
 * Jaw stages → one key per group (only present when both jaws are ready).
 * Attachments → one key per notifiable file (Wall Fill Only excluded).
 * Final → stage:final (copy: AI Generation Complete).
 */
export const getVisibleReadyKeys = (visibleGroups = []) => {
  const keys = new Set();

  (visibleGroups || []).forEach((group) => {
    if (!group?.title) return;

    if (group.title === PIPELINE_STAGES.ATTACHMENTS.title) {
      (group.files || []).forEach((file) => {
        const label = file.displayLabel || file.name;
        const key = ATTACHMENT_LABEL_TO_KEY[label];
        if (key) keys.add(key);
      });
      return;
    }

    if (SKIP_STAGE_TITLES.has(group.title)) return;

    const key = STAGE_TITLE_TO_KEY[group.title];
    if (key) keys.add(key);
  });

  return keys;
};

const buildNotification = (key) => ({
  id: `${key}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  key,
  message: NOTIFICATION_COPY[key] || 'Stage Ready',
});

/**
 * Observes visibleGroups and queues success toasts when stages become
 * available in the UI. Diffs against the previous visible key set so
 * Retry/Replace regeneration re-notifies naturally when stages reappear.
 *
 * Does not read current_step, poll status, or download events.
 * Toast component owns visible duration + exit animation, then calls dismiss.
 */
const useStageReadyNotifications = (visibleGroups = []) => {
  const previousKeysRef = useRef(new Set());
  const queueRef = useRef([]);

  const [queueVersion, setQueueVersion] = useState(0);
  const [current, setCurrent] = useState(null);

  // Diff visibleGroups → enqueue newly appeared ready keys.
  useEffect(() => {
    const currentKeys = getVisibleReadyKeys(visibleGroups);
    const previousKeys = previousKeysRef.current;

    const newKeys = [];
    currentKeys.forEach((key) => {
      if (!previousKeys.has(key)) newKeys.push(key);
    });

    // Sync snapshot so disappeared stages (retry invalidate) can re-notify.
    previousKeysRef.current = currentKeys;

    if (newKeys.length === 0) return;

    queueRef.current = [
      ...queueRef.current,
      ...newKeys.map(buildNotification),
    ];
    setQueueVersion((v) => v + 1);
  }, [visibleGroups]);

  // Advance queue when idle (first item, or after dismiss).
  useEffect(() => {
    if (current) return;
    if (queueRef.current.length === 0) return;

    const [next, ...rest] = queueRef.current;
    queueRef.current = rest;
    setCurrent(next);
  }, [current, queueVersion]);

  /** Called after the toast finishes its exit animation. */
  const dismiss = () => {
    if (queueRef.current.length > 0) {
      const [next, ...rest] = queueRef.current;
      queueRef.current = rest;
      setCurrent(next);
      setQueueVersion((v) => v + 1);
      return;
    }
    setCurrent(null);
  };

  return {
    current,
    dismiss,
  };
};

export default useStageReadyNotifications;
