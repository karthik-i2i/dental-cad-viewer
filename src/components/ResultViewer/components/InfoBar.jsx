import React from 'react';
import styles from '../ResultViewer.module.css';
import { DownloadIcon, ShieldIcon } from '../icons';
import { SHIELD_LABELS } from '../constants';

const InfoBar = ({
  originalFile,
  shieldOption,
  formatOption,
  selectedCount,
  totalCount,
  isDownloading,
  canRender,
  onDownload,
}) => {
  return (
    <div className={styles.infoBar}>
      <div className={styles.infoItem}>
        <span className={styles.infoLabel}>Source</span>
        <span className={`${styles.infoValue} ${styles.mono}`}>
          {originalFile?.name || '—'}
        </span>
      </div>

      <div className={styles.infoItem}>
        <span className={styles.infoLabel}>Stentra Type</span>
        <span className={styles.infoValue}>
          {shieldOption
            ? (SHIELD_LABELS[shieldOption] || formatOption(shieldOption))
            : 'None'}
        </span>
      </div>

      <div className={styles.infoItem}>
        <span className={styles.infoLabel}>Format</span>
        <span className={styles.infoValue}>STL Mesh</span>
      </div>

      <div className={styles.infoItem}>
        <span className={styles.infoLabel}>Status</span>
        <span className={`${styles.infoValue} ${styles.highlight}`}>
          AI Generated
        </span>
      </div>

      <div className={styles.downloadWrap}>
        <button
          className={styles.downloadBtn}
          disabled={!canRender || isDownloading}
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

export default InfoBar;