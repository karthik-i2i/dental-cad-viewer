import React from 'react';
import styles from '../ResultViewer.module.css';
import { ShieldIcon } from '../icons';
import { SHIELD_LABELS } from '../constants';

const EmptyState = ({
  originalFile,
  secondFile,
  shieldOption,
  formatOption,
}) => {
  return (
    <div className={styles.emptyState}>
      <p className={styles.emptyTitle}>No AI CAD model yet</p>

      <p className={styles.emptySub}>
        Upload preview is for scan verification only.
      </p>

      <div className={styles.emptyMeta}>
        <span>Uploaded scan:</span>

        <span className={styles.mono}>
          {originalFile?.name || '—'}
          {secondFile ? ` + ${secondFile.name}` : ''}
        </span>
      </div>

      {shieldOption && (
        <div className={styles.shieldBadge}>
          <ShieldIcon />
          Radiation shield:{' '}
          <strong>
            {SHIELD_LABELS[shieldOption] || formatOption(shieldOption)}
          </strong>
        </div>
      )}
    </div>
  );
};

export default EmptyState;