import React from 'react';
import styles from '../ResultViewer.module.css';
import { UploadIcon } from '../icons';

const Header = ({ canRender, onStartOver }) => {
  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.statusBadge}>
          <span className={styles.statusDot} />
          {canRender ? 'AI Generation Complete' : 'Waiting for AI Output'}
        </div>

        <h2 className={styles.headerTitle}>
          3D CAD Model
        </h2>
      </div>

      <button
        className={styles.startOverBtn}
        onClick={onStartOver}
      >
        <UploadIcon />
        {' '}New Scan
      </button>
    </div>
  );
};

export default Header;