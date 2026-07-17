import React, { useEffect } from 'react';
import styles from '../ResultViewer.module.css';

export const CONFIRM_MODAL_MODE = {
  CONFIRM: 'confirm',
  INFO: 'info',
};

/**
 * Lightweight confirmation / info dialog for ResultViewer actions.
 * Matches existing surface styling — no third-party modal library.
 *
 * mode="confirm" — Cancel + Confirm (mutation flows).
 * mode="info"    — single dismiss control; no mutation.
 */
const ConfirmModal = ({
  open,
  title,
  children,
  mode = CONFIRM_MODAL_MODE.CONFIRM,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  dismissLabel = 'OK',
  onConfirm,
  onCancel,
  confirmDisabled = false,
}) => {
  const isInfo = mode === CONFIRM_MODAL_MODE.INFO;
  const dismissBlocked = !isInfo && confirmDisabled;

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !dismissBlocked) onCancel?.();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel, dismissBlocked]);

  if (!open) return null;

  return (
    <div
      className={styles.modalOverlay}
      role="presentation"
      onClick={dismissBlocked ? undefined : onCancel}
    >
      <div
        className={styles.modalDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="result-confirm-title" className={styles.modalTitle}>
          {title}
        </h3>

        <div className={styles.modalBody}>{children}</div>

        <div className={styles.modalActions}>
          {isInfo ? (
            <button
              type="button"
              className={styles.modalConfirmBtn}
              onClick={onCancel}
            >
              {dismissLabel}
            </button>
          ) : (
            <>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={onCancel}
                disabled={confirmDisabled}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                className={styles.modalConfirmBtn}
                onClick={onConfirm}
                disabled={confirmDisabled}
              >
                {confirmLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
