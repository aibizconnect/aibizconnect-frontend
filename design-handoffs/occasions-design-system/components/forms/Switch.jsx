import React from 'react';

export function Switch({ label, description, checked, defaultChecked, onChange, disabled = false, size = 'md', id, style, ...rest }) {
  const isControlled = checked !== undefined;
  const [internal, setInternal] = React.useState(defaultChecked || false);
  const on = isControlled ? checked : internal;
  const fieldId = id || (label ? `sw-${String(label).replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const W = size === 'sm' ? 34 : 44, H = size === 'sm' ? 20 : 26, K = H - 6;

  const toggle = (e) => {
    if (disabled) return;
    if (!isControlled) setInternal(e.target.checked);
    onChange?.(e);
  };

  return (
    <label htmlFor={fieldId} style={{ display: 'flex', alignItems: description ? 'flex-start' : 'center', gap: 12, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, ...style }}>
      <span style={{ position: 'relative', display: 'inline-flex', flex: 'none' }}>
        <input type="checkbox" id={fieldId} checked={isControlled ? checked : undefined} defaultChecked={isControlled ? undefined : defaultChecked} onChange={toggle} disabled={disabled}
          style={{ position: 'absolute', opacity: 0, width: W, height: H, margin: 0, cursor: 'inherit' }} {...rest} />
        <span style={{
          width: W, height: H, borderRadius: 'var(--radius-pill)',
          background: on ? 'var(--color-primary)' : 'var(--gray-300)',
          transition: 'background var(--dur-base) var(--ease-out)', display: 'inline-block', position: 'relative',
        }}>
          <span style={{
            position: 'absolute', top: 3, left: 3, width: K, height: K, borderRadius: '50%',
            background: 'var(--white)', boxShadow: 'var(--shadow-sm)',
            transform: on ? `translateX(${W - H}px)` : 'translateX(0)',
            transition: 'transform var(--dur-base) var(--ease-spring)',
          }} />
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
