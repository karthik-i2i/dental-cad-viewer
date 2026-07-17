import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './StageReadyToast.module.css';

const VISIBLE_MS = 4000;

/** Mount point rendered in App `.appHeader` — keeps toast global while logic stays in ResultViewer. */
export const APP_HEADER_TOAST_ROOT_ID = 'app-header-toast-root';

/**
 * Presentational stage-ready toast.
 * Shows one notification at a time; after ~4s fades out, then calls onDismiss
 * so the hook can advance the queue.
 * Portaled into the global app header so it is not constrained by ResultViewer.
 */
const StageReadyToast = ({ current, onDismiss }) => {
  const [phase, setPhase] = useState('hidden');
  const [displayed, setDisplayed] = useState(null);
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => {
    setPortalTarget(document.getElementById(APP_HEADER_TOAST_ROOT_ID));
  }, []);

  useEffect(() => {
    if (!current) return undefined;

    setDisplayed(current);
    setPhase('enter');

    const enterId = window.requestAnimationFrame(() => {
      setPhase('shown');
    });

    const exitTimer = window.setTimeout(() => {
      setPhase('exit');
    }, VISIBLE_MS);

    return () => {
      window.cancelAnimationFrame(enterId);
      window.clearTimeout(exitTimer);
    };
  }, [current]);

  const handleAnimationEnd = (event) => {
    if (event.target !== event.currentTarget) return;
    if (phase !== 'exit') return;

    setDisplayed(null);
    setPhase('hidden');
    onDismiss?.();
  };

  if (!displayed || !portalTarget) return null;

  const phaseClass =
    phase === 'enter'
      ? styles.enter
      : phase === 'exit'
        ? styles.exit
        : styles.shown;

  return createPortal(
    <div className={styles.host} aria-live="polite" aria-atomic="true">
      <div
        className={`${styles.toast} ${phaseClass}`}
        role="status"
        onAnimationEnd={handleAnimationEnd}
      >
        <span className={styles.check} aria-hidden="true">
          ✓
        </span>
        <span className={styles.message}>{displayed.message}</span>
      </div>
    </div>,
    portalTarget
  );
};

export default StageReadyToast;
