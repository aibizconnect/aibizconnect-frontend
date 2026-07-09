import React from 'react';

export function Checkbox({ label, description, checked, defaultChecked, onChange, disabled = false, id, style, ...rest }) {
  const isControlled = checked !== undefined;
  const [internal, setInternal] = React.useState(defaultChecked || false);
  const on = isControlled ? checked : internal;
  const fieldId = id || (label ? `cb-${String(label).replace(/\s+/g, '-').toLowerCase()}` : undefined);

  const toggle = (e) => {
    if (disabled) return;
    if (!isControlled) setInternal(e.target.checked);
    onChange?.(e);
  };

  return (
    <label htmlFor={fieldId} style={{ display: 'flex', alignItems: description ? 'flex-start' : 'center', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, ...style }}>
      <span style={{ position: 'relative', display: 'inline-flex', flex: 'none', marginTop: description ? 1 : 0 }}>
        <input type="checkbox" id={fieldId} checked={isControlled ? checked : undefined} defaultChecked={isControlled ? undefined : defaultChecked} onChange={toggle} disabled={disabled}
          style={{ position: 'absolute', opacity: 0, width: 20, height: 20, margin: 0, cursor: 'inherit' }} {...rest} />
        <span style={{
          width: 20, height: 20, borderRadius: 'var(--radius-xs)',
          border: `1.5px solid ${on ? 'var(--color-primary)' : 'var(--border-strong)'}`,
          background: on ? 'var(--color-primary)' : 'var(--surface-card)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
        }}>
          {on && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          )}
        </span>
      </span>
      {label && (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-strong)', lineHeight: 1.4 }}>{label}</span>
          {description && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.4 }}>{description}</span>}
        </span>
      )}
    </label>
  );
}
