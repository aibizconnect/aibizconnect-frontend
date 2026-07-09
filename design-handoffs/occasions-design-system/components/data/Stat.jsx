import React from 'react';

export function Stat({ label, value, delta, deltaDirection, icon, style, ...rest }) {
  const dir = deltaDirection || (delta && String(delta).trim().startsWith('-') ? 'down' : 'up');
  const positive = dir === 'up';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }} {...rest}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon && (
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 'var(--radius-sm)', background: 'var(--blue-50)', color: 'var(--color-primary)' }}>{icon}</span>
        )}
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-muted)', letterSpacing: 'var(--tracking-snug)' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-3xl)', color: 'var(--text-heading)', letterSpacing: 'var(--tracking-tight)', lineHeight: 1 }}>{value}</span>
        {delta != null && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: positive ? 'var(--green-600)' : 'var(--red-600)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transform: positive ? 'none' : 'rotate(180deg)' }}>
              <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {String(delta).replace(/^-/, '')}
          </span>
        )}
      </div>
    </div>
  );
}
