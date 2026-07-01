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
}) => {
  return (
    <div className={styles.confirmBar}>
      <div className={styles.confirmNote}>
        <CheckCircleIcon />
        <p>Verify the scan geometry looks correct before proceeding</p>
      </div>

      <div className={styles.confirmActions}>
        <button
          className={styles.cancelBtn}
          onClick={onReupload}
        >
          Re-upload
        </button>

        <button
          className={styles.confirmBtn}
          onClick={handleConfirm}
          disabled={!canProceed}
          title={!canProceed ? 'Please select a stentra type first' : undefined}
        >
          Confirm & Process
          <ArrowIcon />
        </button>
      </div>
    </div>
  );
};

export default ConfirmBar;

