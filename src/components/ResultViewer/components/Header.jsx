import React from 'react';
import styles from '../ResultViewer.module.css';
import { UploadIcon, DownloadIcon } from '../icons';

/**
 * Native `title` tooltips match ConfirmBar / ToolButton elsewhere in the app.
 * Disabled buttons are wrapped so the tooltip still appears on hover.
 */
const ActionButton = ({
  label,
  disabled,
  tooltip,
  onClick,
  className = styles.secondaryBtn,
}) => {
  const button = (
    <button
      type="button"
      className={className}
      disabled={disabled}
      onClick={onClick}
      title={!disabled && tooltip ? tooltip : undefined}
    >
      {label}
    </button>
  );

  if (!disabled || !tooltip) return button;

  return (
    <span className={styles.actionBtnWrap} title={tooltip}>
      {button}
    </span>
  );
};

const BADGE_TONE_CLASS = {
  waiting: styles.statusBadgeWaiting,
  progress: styles.statusBadgeProgress,
  success: styles.statusBadgeSuccess,
  error: styles.statusBadgeError,
};

const Header = ({
  canRender,
  onGoHome,
  onGoBack,
  onDownload,
  isDownloading,
  selectedCount,
  canRetry = false,
  canReplace = false,
  actionTooltip = null,
  onRetry,
  onReplace,
  navLocked = false,
  navLockedTooltip = null,
  statusBadge = null,
}) => {
  const retryDisabled = !canRender || !canRetry;
  const replaceDisabled = !canRender || !canReplace;
  const disabledTooltip = !canRender
    ? 'Wait for the model to finish loading.'
    : actionTooltip;

  const badge = statusBadge || {
    tone: canRender ? 'success' : 'waiting',
    label: canRender ? 'AI Generation Complete' : 'Waiting for AI Output',
    detail: null,
  };

  const badgeClass = `${styles.statusBadge} ${
    BADGE_TONE_CLASS[badge.tone] || styles.statusBadgeSuccess
  }`;

  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={badgeClass}>
          <span className={styles.statusDot} />
          <span className={styles.statusBadgeText}>
            <span className={styles.statusBadgeLabel}>{badge.label}</span>
            {badge.detail ? (
              <span className={styles.statusBadgeDetail}>{badge.detail}</span>
            ) : null}
          </span>
        </div>

        {/* <h2 className={styles.headerTitle}>
          3D CAD Model
        </h2> */}
      </div>

      <div className={styles.headerActions}>
        <ActionButton
          label="Go Back"
          disabled={navLocked}
          tooltip={navLocked ? navLockedTooltip : undefined}
          onClick={onGoBack}
          className={styles.secondaryBtn}
        />

        {navLocked && navLockedTooltip ? (
          <span className={styles.actionBtnWrap} title={navLockedTooltip}>
            <button
              type="button"
              className={styles.startOverBtn}
              disabled
            >
              <UploadIcon />
              {' '}Go Home
            </button>
          </span>
        ) : (
          <button
            type="button"
            className={styles.startOverBtn}
            onClick={onGoHome}
          >
            <UploadIcon />
            {' '}Go Home
          </button>
        )}
        <ActionButton
          label="Retry"
          disabled={retryDisabled}
          tooltip={retryDisabled ? disabledTooltip : undefined}
          onClick={onRetry}
        />

        <ActionButton
          label="Replace"
          disabled={replaceDisabled}
          tooltip={replaceDisabled ? disabledTooltip : undefined}
          onClick={onReplace}
        />
        <button
          type="button"
          className={styles.downloadBtn}
          disabled={!canRender || isDownloading || selectedCount === 0}
          onClick={onDownload}
        >
          <DownloadIcon />
          {isDownloading
            ? 'Preparing ZIP...'
            : `Download STL (${selectedCount})`}
        </button>
      </div>
    </div>
  );
};

export default Header;
