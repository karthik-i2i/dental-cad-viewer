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
  onStartOver,
  onDownload,
  isDownloading,
  selectedCount,
  canRetry = false,
  canReplace = false,
  actionTooltip = null,
  onRetry,
  onReplace,
  startOverDisabled = false,
  startOverTooltip = null,
  statusBadge = null,
}) => {
  const retryDisabled = !canRender || !canRetry;
  const replaceDisabled = !canRender || !canReplace;
  const disabledTooltip = !canRender
    ? 'Wait for the model to finish loading.'
    : actionTooltip;

  const newScanDisabled = startOverDisabled;
  const newScanTooltip = startOverDisabled
    ? startOverTooltip || actionTooltip
    : undefined;

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

        <h2 className={styles.headerTitle}>
          3D CAD Model
        </h2>
      </div>

      <div className={styles.headerActions}>
        <ActionButton
          label="Replace"
          disabled={replaceDisabled}
          tooltip={replaceDisabled ? disabledTooltip : undefined}
          onClick={onReplace}
        />

        <ActionButton
          label="Retry"
          disabled={retryDisabled}
          tooltip={retryDisabled ? disabledTooltip : undefined}
          onClick={onRetry}
        />

        <button
          type="button"
          className={styles.downloadBtn}
          disabled={!canRender || isDownloading}
          onClick={onDownload}
        >
          <DownloadIcon />
          {isDownloading
            ? 'Preparing ZIP...'
            : `Download STL (${selectedCount})`}
        </button>

        {newScanDisabled && newScanTooltip ? (
          <span className={styles.actionBtnWrap} title={newScanTooltip}>
            <button
              type="button"
              className={styles.startOverBtn}
              disabled
            >
              <UploadIcon />
              {' '}New Scan
            </button>
          </span>
        ) : (
          <button
            type="button"
            className={styles.startOverBtn}
            onClick={onStartOver}
          >
            <UploadIcon />
            {' '}New Scan
          </button>
        )}
      </div>
    </div>
  );
};

export default Header;
