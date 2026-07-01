import React from 'react';
import styles from '../ResultViewer.module.css';

const ProgressState = ({
  progressPercentage,
  currentStep,
  progressIndex,
  totalSteps,
}) => {
  return (
    <div className={styles.progressState}>
      <div className={styles.progressHeader}>
        <p className={styles.progressTitle}>
          AI design in progress
        </p>

        <p className={styles.progressSub}>
          This is a prototype loading screen, the real AI build may take longer.
        </p>
      </div>

      <div className={styles.progressBar}>
        <div
          className={styles.progressBarFill}
          style={{ width: `${progressPercentage}%` }}
        />

        <div className={styles.progressBarLabel}>
          {currentStep}
        </div>
      </div>

      <div className={styles.progressCurrent}>
        <span>
          Step {Math.min(progressIndex + 1, totalSteps)} of {totalSteps}
        </span>
      </div>
    </div>
  );
};

export default ProgressState;