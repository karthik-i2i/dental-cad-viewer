import React from 'react';

const SummaryRow = ({ label, value, mono, highlight }) => {
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '7px 0', borderBottom: '1px solid var(--border)',
    fontSize: '13px',
  }}>
    <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{label}</span>
    <span style={{
      fontWeight: 800,
      fontFamily: mono ? 'var(--font-mono)' : undefined,
      color: highlight ? '#0b6a45' : 'var(--text-primary)',
      maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }}>
      {value || '—'}
    </span>
  </div>
};

export default SummaryRow;