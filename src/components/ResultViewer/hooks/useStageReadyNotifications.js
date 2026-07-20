import { useCallback, useEffect, useRef, useState } from 'react';
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

/** Visible duration before exit animation begins. */
export const TOAST_VISIBLE_MS = 4000;
/** Must match StageReadyToast exit animation duration. */
export const TOAST_EXIT_MS = 280;
const TOAST_TOTAL_MS = TOAST_VISIBLE_MS + TOAST_EXIT_MS;

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
  type: 'success',
});

/**
 * Observes visibleGroups and queues success toasts when stages become
 * available in the UI. Diffs against the previous visible key set so
 * Retry/Replace regeneration re-notifies naturally when stages reappear.
 *
 * Owns notification lifetime (visible + exit) with wall-clock catch-up so
 * background tabs / throttled timers cannot leave a toast stuck forever.
 * The toast component is presentational only.
 *
 * Also exposes imperative `enqueue({ key, message, type? })` for other
 * viewer actions (e.g. selection guards). Missing type defaults to
 * "success". Duplicate keys already current or waiting are ignored.
 */
const useStageReadyNotifications = (visibleGroups = []) => {
  const previousKeysRef = useRef(new Set());
  const queueRef = useRef([]);
  const currentRef = useRef(null);
  const startedAtRef = useRef(null);
  const timersRef = useRef({ exit: null, dismiss: null });

  const [queueVersion, setQueueVersion] = useState(0);
  const [current, setCurrent] = useState(null);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  const clearLifetimeTimers = useCallback(() => {
    if (timersRef.current.exit != null) {
      window.clearTimeout(timersRef.current.exit);
    }
    if (timersRef.current.dismiss != null) {
      window.clearTimeout(timersRef.current.dismiss);
    }
    timersRef.current = { exit: null, dismiss: null };
  }, []);

  /** Expire current and promote the next queued item (or clear). */
  const advance = useCallback(() => {
    clearLifetimeTimers();

    if (queueRef.current.length > 0) {
      const [next, ...rest] = queueRef.current;
      queueRef.current = rest;
      currentRef.current = next;
      startedAtRef.current = Date.now();
      setIsExiting(false);
      setCurrent(next);
      setQueueVersion((v) => v + 1);
      return;
    }

    currentRef.current = null;
    startedAtRef.current = null;
    setIsExiting(false);
    setCurrent(null);
  }, [clearLifetimeTimers]);

  /**
   * Schedule / catch up lifetime from wall clock.
   * Skips notifications that should already have finished while the tab
   * was hidden so returning later does not replay stale toasts.
   */
  const syncLifetime = useCallback(() => {
    clearLifetimeTimers();

    if (!currentRef.current) return;

    let startedAt = startedAtRef.current;
    if (startedAt == null) {
      startedAt = Date.now();
      startedAtRef.current = startedAt;
    }

    const now = Date.now();
    let cur = currentRef.current;
    let changed = false;

    while (cur && now >= startedAt + TOAST_TOTAL_MS) {
      if (queueRef.current.length > 0) {
        const [next, ...rest] = queueRef.current;
        queueRef.current = rest;
        cur = next;
        startedAt += TOAST_TOTAL_MS;
        changed = true;
      } else {
        cur = null;
        startedAt = null;
        changed = true;
        break;
      }
    }

    currentRef.current = cur;
    startedAtRef.current = startedAt;

    if (changed) {
      setIsExiting(false);
      setCurrent(cur);
      // Re-enter via the `current` effect so timers bind to the caught-up item.
      return;
    }

    if (!cur || startedAt == null) {
      setIsExiting(false);
      return;
    }

    const elapsed = now - startedAt;
    const shouldExit = elapsed >= TOAST_VISIBLE_MS;
    setIsExiting(shouldExit);

    const msUntilExit = Math.max(0, TOAST_VISIBLE_MS - elapsed);
    const msUntilDismiss = Math.max(0, TOAST_TOTAL_MS - elapsed);

    if (!shouldExit) {
      timersRef.current.exit = window.setTimeout(() => {
        setIsExiting(true);
      }, msUntilExit);
    }

    timersRef.current.dismiss = window.setTimeout(() => {
      advance();
    }, msUntilDismiss);
  }, [advance, clearLifetimeTimers]);

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

  // Promote from queue when idle.
  useEffect(() => {
    if (current) return;
    if (queueRef.current.length === 0) return;

    const [next, ...rest] = queueRef.current;
    queueRef.current = rest;
    currentRef.current = next;
    startedAtRef.current = Date.now();
    setIsExiting(false);
    setCurrent(next);
  }, [current, queueVersion]);

  // Own lifetime for the active notification (timers + visibility catch-up).
  useEffect(() => {
    if (!current) {
      clearLifetimeTimers();
      setIsExiting(false);
      return undefined;
    }

    if (startedAtRef.current == null) {
      startedAtRef.current = Date.now();
    }

    syncLifetime();

    const onVisibilityChange = () => {
      if (!document.hidden) {
        syncLifetime();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearLifetimeTimers();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [current, syncLifetime, clearLifetimeTimers]);

  /**
   * Imperative toast enqueue for non-stage events.
   * Skips if the same key is already showing or waiting.
   * @param {{ key: string, message: string, type?: 'success'|'info' }} payload
   */
  const enqueue = useCallback(({ key, message, type = 'success' } = {}) => {
    if (!key || !message) return;

    if (currentRef.current?.key === key) return;
    if (queueRef.current.some((item) => item.key === key)) return;

    queueRef.current = [
      ...queueRef.current,
      {
        id: `${key}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        key,
        message,
        type,
      },
    ];
    setQueueVersion((v) => v + 1);
  }, []);

  /** Manually dismiss the current toast and advance the queue. */
  const dismiss = useCallback(() => {
    advance();
  }, [advance]);

  return {
    current,
    isExiting,
    dismiss,
    enqueue,
  };
};

export default useStageReadyNotifications;
