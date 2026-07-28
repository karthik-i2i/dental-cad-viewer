import React from 'react';
import styles from '../Upload.module.css';
import {
  CheckCircleIcon,
  ArrowIcon,
} from '../icons';

const ConfirmBar = ({
  canProceed,
  handleConfirm,
  onReupload,
  disabledReason,
  isSubmitting = false,
}) => {
  const confirmDisabled = !canProceed || isSubmitting;
  const confirmTitle = isSubmitting
    ? 'Creating AI job. Please wait...'
    : !canProceed
      ? disabledReason || undefined
      : undefined;

  return (
    <div className={styles.confirmBar}>
      <div className={styles.confirmNote}>
        <CheckCircleIcon />
        <p>Verify the scan geometry looks correct before proceeding</p>
      </div>

      <div className={styles.confirmActions}>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={onReupload}
        >
          Re-upload
        </button>

        <button
          type="button"
          className={styles.confirmBtn}
          onClick={handleConfirm}
          disabled={confirmDisabled}
          title={confirmTitle}
        >
          {isSubmitting ? 'Creating AI Job...' : 'Confirm & Process'}
          {!isSubmitting ? <ArrowIcon /> : null}
        </button>
      </div>
    </div>
  );
};

export default ConfirmBar;
