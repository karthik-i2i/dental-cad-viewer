import React from 'react';
import styles from '../Upload.module.css';
import { SHIELD_OPTIONS } from '../constants';
import {
  ShieldIcon,
  ShieldCheckIcon,
  CheckSmallIcon,
} from '../icons';

const ShieldSection = ({
  shieldOption,
  onStentraTypeChange,
}) => {
  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <ShieldIcon />
        <span>Stentra Type</span>
      </div>

      <div className={styles.shieldGrid}>
        {SHIELD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`${styles.shieldCard} ${shieldOption === opt.value ? styles.shieldCardActive : ''}`}
            onClick={() => onStentraTypeChange(opt.value)}
          >
            <div className={styles.shieldCardTop}>
              <span className={styles.shieldLabel}>{opt.label}</span>
              {shieldOption === opt.value && (
                <span className={styles.shieldCheck}><CheckSmallIcon /></span>
              )}
            </div>
            <p className={styles.shieldDesc}>{opt.desc}</p>
          </button>
        ))}
      </div>

      {shieldOption && (
        <div className={styles.shieldSelected}>
          <ShieldCheckIcon />
          <span>
            Shield zone set to <strong>{SHIELD_OPTIONS.find(o => o.value === shieldOption)?.label}</strong>.
            AI will generate a custom stent to protect remaining dentition.
          </span>
        </div>
      )}
    </div>
  );
};

export default ShieldSection;
