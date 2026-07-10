import React from 'react';

// ── Icons ──────────────────────────────────────────────────────────────────────
export const ScanIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <rect x="4" y="4" width="32" height="32" rx="8" stroke="#1A6B9A" strokeWidth="2" strokeDasharray="4 3"/>
    <path d="M12 20h16M20 12v16" stroke="#1DB8B0" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="20" cy="20" r="4" fill="#1A6B9A" fillOpacity="0.18" stroke="#1A6B9A" strokeWidth="2"/>
  </svg>
);

export const ScanSmallIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="12" height="12" rx="3" stroke="#1A6B9A" strokeWidth="1.5" strokeDasharray="3 2"/>
    <path d="M5 8h6M8 5v6" stroke="#1DB8B0" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const FileIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path d="M5 2h8l5 5v13a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" fill="#E8F1F7" stroke="#1A6B9A" strokeWidth="1.5"/>
    <path d="M13 2v5h5" stroke="#1A6B9A" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M8 11h6M8 14h4" stroke="#1A6B9A" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

export const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2L3 4v4c0 3 2.5 5.4 5 6 2.5-.6 5-3 5-6V4L8 2z" stroke="#1A9F6E" strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>
);

export const ShieldCheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2L3 4v4c0 3 2.5 5.4 5 6 2.5-.6 5-3 5-6V4L8 2z" stroke="#1A9F6E" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M5.5 8l2 2L11 6" stroke="#1A9F6E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const CheckSmallIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2.5 6l2.5 2.5L9.5 4" stroke="#1A9F6E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const RotateIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 7a5 5 0 1010 0 5 5 0 00-10 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M11.5 4.5L13 7l-1.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const CheckCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" stroke="#1A9F6E" strokeWidth="1.5"/>
    <path d="M5 8l2 2 4-4" stroke="#1A9F6E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
