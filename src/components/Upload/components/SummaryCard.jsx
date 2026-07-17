import React from 'react';
import styles from '../Upload.module.css';
import { SHIELD_OPTIONS } from '../constants';
import SummaryRow from './SummaryRow';

const SummaryCard = ({
  maxillaFile,
  mandibleFile,
  selectedPreview,
  shieldOption,
}) => {
  const previewLabel =
    selectedPreview === 'maxilla' ? 'Maxilla' : 'Mandible';

  return (
    <div className={styles.summaryCard}>
      <SummaryRow label="Maxilla" value={maxillaFile?.name} mono />
      <SummaryRow label="Mandible" value={mandibleFile?.name} mono />
      <SummaryRow label="Previewing" value={previewLabel} />
      <SummaryRow
        label="Stentra Type"
        value={SHIELD_OPTIONS.find(o => o.value === shieldOption)?.label || 'Not selected'}
        highlight={Boolean(shieldOption)}
      />
    </div>
  );
};

export default SummaryCard;
