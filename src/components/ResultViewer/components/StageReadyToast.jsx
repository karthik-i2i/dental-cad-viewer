import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './StageReadyToast.module.css';

/** Mount point rendered in App `.appHeader` — keeps toast global while logic stays in ResultViewer. */
export const APP_HEADER_TOAST_ROOT_ID = 'app-header-toast-root';

/**
 * Presentational toast.
 * Lifetime / queue advancement are owned by useStageReadyNotifications.
 * Enter animation runs on mount via CSS; exit class is driven by `exiting`.
 * Does not call dismiss — animationend is visual only.
 */
const StageReadyToast = ({ current, exiting = false }) => {
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => {
    setPortalTarget(document.getElementById(APP_HEADER_TOAST_ROOT_ID));
  }, []);

  if (!current || !portalTarget) return null;

  const phaseClass = exiting ? styles.exit : styles.shown;
  const toastType = current.type === 'info' ? 'info' : 'success';
  const isInfo = toastType === 'info';

  return createPortal(
    <div className={styles.host} aria-live="polite" aria-atomic="true">
      <div className={`${styles.toast} ${phaseClass}`} role="status">
        <span
          className={`${styles.icon} ${
            isInfo ? styles.iconInfo : styles.iconSuccess
          }`}
          aria-hidden="true"
        >
          {isInfo ? (
            <svg
              className={styles.infoGlyph}
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="currentColor"
            >
              <circle cx="5" cy="2.1" r="1.15" />
              <rect x="4.15" y="4" width="1.7" height="4.4" rx="0.85" />
            </svg>
          ) : (
            '✓'
          )}
        </span>
        <span className={styles.message}>{current.message}</span>
      </div>
    </div>,
    portalTarget
  );
};

export default StageReadyToast;
