import React from 'react';
import styles from '../Upload.module.css';

const SummaryRow = ({ label, value, mono, highlight }) => {
  return (
    <div className={styles.summaryRow}>
      <span className={styles.summaryLabel}>{label}</span>
      <span
        className={[
          styles.summaryValue,
          mono ? styles.summaryValueMono : '',
          highlight ? styles.summaryValueHighlight : '',
        ].filter(Boolean).join(' ')}
      >
        {value || '—'}
      </span>
    </div>
  );
};

export default SummaryRow;
