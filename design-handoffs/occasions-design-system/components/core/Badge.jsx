import React from 'react';

const TONES = {
  neutral: { bg: 'var(--gray-100)', fg: 'var(--gray-700)', dot: 'var(--gray-500)' },
  brand:   { bg: 'var(--blue-50)',  fg: 'var(--blue-600)', dot: 'var(--blue-500)' },
  success: { bg: 'var(--green-100)', fg: 'var(--green-600)', dot: 'var(--green-500)' },
  warning: { bg: 'var(--amber-100)', fg: 'var(--amber-600)', dot: 'var(--amber-500)' },
  danger:  { bg: 'var(--red-100)',   fg: 'var(--red-600)',   dot: 'var(--red-500)' },
};

export function Badge({ children, tone = 'neutral', dot = false, solid = false, style, ...rest }) {
  const t = TONES[tone] || TONES.neutral;
  const base = solid
    ? { background: t.dot, color: 'var(--white)' }
    : { background: t.bg, color: t.fg };
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        height: 22, padding: '0 9px', borderRadius: 'var(--radius-pill)',
        fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)',
        letterSpacing: 'var(--tracking-snug)', lineHeight: 1, whiteSpace: 'nowrap',
        ...base, ...style,
      }}
      {...rest}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: solid ? 'var(--white)' : t.dot, flex: 'none' }} />}
      {children}
    </span>
  );
}
