import React, { useState } from 'react';

export function Select({ label, hint, error, size = 'md', id, disabled = false, children, style, containerStyle, ...rest }) {
  const [focus, setFocus] = useState(false);
  const height = { sm: 'var(--control-h-sm)', md: 'var(--control-h-md)', lg: 'var(--control-h-lg)' }[size];
  const fieldId = id || (label ? `sel-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const borderColor = error ? 'var(--danger)' : focus ? 'var(--border-focus)' : 'var(--border-default)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...containerStyle }}>
      {label && <label htmlFor={fieldId} style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-strong)' }}>{label}</label>}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <select
          id={fieldId} disabled={disabled}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{
            appearance: 'none', WebkitAppearance: 'none', width: '100%', height,
            padding: '0 38px 0 12px', background: disabled ? 'var(--gray-100)' : 'var(--surface-card)',
            border: `1px solid ${borderColor}`, borderRadius: 'var(--radius-md)',
            boxShadow: focus ? 'var(--ring-focus)' : 'var(--shadow-xs)',
            fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-strong)',
            cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, outline: 'none',
            transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
            ...style,
          }}
          {...rest}
        >
          {children}
        </select>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', right: 12, pointerEvents: 'none', color: 'var(--text-muted)' }}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {(hint || error) && <span style={{ fontSize: 'var(--text-xs)', color: error ? 'var(--danger)' : 'var(--text-muted)' }}>{error || hint}</span>}
    </div>
  );
}
