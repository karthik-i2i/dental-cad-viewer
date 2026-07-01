import React from 'react';
import styles from '../ResultViewer.module.css';

/* ── Sub-components ─────────────────────────────────────────────────────────── */

export const ToolButton = ({ active, onClick, label, icon, disabled }) => (
  <button
    className={`${styles.toolBtn} ${active ? styles.toolBtnActive : ''}`}
    onClick={onClick}
    title={label}
    disabled={disabled}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export const HintPill = ({ icon, text }) => (
  <div className={styles.hintPill}>
    <span>{icon}</span>
    <span>{text}</span>
  </div>
);

export const InfoItem = ({ label, value, mono, highlight }) => (
  <div className={styles.infoItem}>
    <span className={styles.infoLabel}>{label}</span>
    <span className={`${styles.infoValue} ${mono ? styles.mono : ''} ${highlight ? styles.highlight : ''}`}>
      {value}
    </span>
  </div>
);