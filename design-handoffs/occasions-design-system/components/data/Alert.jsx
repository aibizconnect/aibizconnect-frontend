import React from 'react';

const TONES = {
  info:    { bg: 'var(--blue-50)',  border: 'var(--blue-200)',  fg: 'var(--blue-700)',  icon: 'var(--blue-500)' },
  success: { bg: 'var(--green-100)', border: '#bfe6d4', fg: 'var(--green-600)', icon: 'var(--green-500)' },
  warning: { bg: 'var(--amber-100)', border: '#f0dca6', fg: 'var(--amber-600)', icon: 'var(--amber-500)' },
  danger:  { bg: 'var(--red-100)',   border: '#f3c5c8', fg: 'var(--red-600)',   icon: 'var(--red-500)' },
};

const PATHS = {
  info: 'M12 16v-5M12 8h.01M12 3a9 9 0 100 18 9 9 0 000-18z',
  success: 'M20 6L9 17l-5-5',
  warning: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.9a2 2 0 00-3.4 0z',
  danger: 'M12 8v5M12 16h.01M12 3a9 9 0 100 18 9 9 0 000-18z',
};

export function Alert({ tone = 'info', title, children, onClose, style, ...rest }) {
  const t = TONES[tone] || TONES.info;
  return (
    <div role="alert" style={{
      display: 'flex', gap: 12, padding: 'var(--space-4)',
      background: t.bg, border: `1px solid ${t.border}`, borderRadius: 'var(--radius-md)', ...style,
    }} {...rest}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flex: 'none', color: t.icon, marginTop: 1 }}>
        <path d={PATHS[tone]} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', color: t.fg, marginBottom: children ? 3 : 0 }}>{title}</div>}
        {children && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.5 }}>{children}</div>}
      </div>
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss" style={{ flex: 'none', border: 'none', background: 'transparent', cursor: 'pointer', color: t.fg, padding: 2, display: 'inline-flex', opacity: 0.7 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      )}
    </div>
  );
}
