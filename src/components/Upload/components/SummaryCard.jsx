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
  return (
    <div className={styles.summaryCard}>
      <SummaryRow label="Mandible" value={maxillaFile?.name} mono />
      {mandibleFile && <SummaryRow label="Maxilla" value={mandibleFile.name} mono />}
      <SummaryRow label="Previewing" value={
        selectedPreview === 'scan1' ? 'Mandible' : 'Maxilla'
      } />
      {/* <SummaryRow label="Jaw position"
        value={JAW_POSITIONS.find(o => o.value === toothType)?.label || '—'} />
      <SummaryRow label="Stent"
        value={STENT_POSITIONS.find(o => o.value === stentOption)?.label || 'None'} /> */}
      <SummaryRow label="Stentra Type"
        value={SHIELD_OPTIONS.find(o => o.value === shieldOption)?.label || 'Not selected'}
        highlight={Boolean(shieldOption)}
      />
    </div>
  );
};

export default SummaryCard;





