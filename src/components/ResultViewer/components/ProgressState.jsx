import React from 'react';
import styles from '../ResultViewer.module.css';
import { LOADING_PROGRESS_TRANSITION_MS } from '../constants';

const ProgressState = ({
  progressPercentage,
  currentStep,
  progressIndex,
  totalSteps,
  showStepCount = true,
  /** Set 0 when an external rAF loop owns the motion (backend display progress). */
  transitionMs = LOADING_PROGRESS_TRANSITION_MS,
  subtitle = 'This is a prototype loading screen, the real AI build may take longer.',
}) => {
  return (
    <div className={styles.progressState}>
      <div className={styles.progressHeader}>
        <p className={styles.progressTitle}>
          AI design in progress
        </p>

        {subtitle ? (
          <p className={styles.progressSub}>
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className={styles.progressBar}>
        <div
          className={styles.progressBarFill}
          style={{
            width: `${progressPercentage}%`,
            transitionDuration: `${transitionMs}ms`,
          }}
        >
          <span className={styles.progressBarShimmer} aria-hidden="true" />
        </div>

        <div className={styles.progressBarLabel}>
          {currentStep}
        </div>
      </div>

      {showStepCount && totalSteps != null ? (
        <div className={styles.progressCurrent}>
          <span>
            Step {Math.min(progressIndex + 1, totalSteps)} of {totalSteps}
          </span>
        </div>
      ) : null}
    </div>
  );
};

export default ProgressState;
