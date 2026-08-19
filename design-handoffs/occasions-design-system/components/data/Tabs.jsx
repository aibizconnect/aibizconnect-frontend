import React, { useState } from 'react';

export function Tabs({ tabs = [], value, defaultValue, onChange, style, ...rest }) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? tabs[0]?.value);
  const active = isControlled ? value : internal;

  const select = (v) => { if (!isControlled) setInternal(v); onChange?.(v); };

  return (
    <div role="tablist" style={{ display: 'inline-flex', gap: 4, padding: 4, background: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)', ...style }} {...rest}>
      {tabs.map((t) => {
        const on = t.value === active;
        return (
          <button key={t.value} role="tab" aria-selected={on} onClick={() => select(t.value)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, height: 34, padding: '0 14px',
              border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)',
              background: on ? 'var(--surface-card)' : 'transparent',
              color: on ? 'var(--color-primary)' : 'var(--text-muted)',
              boxShadow: on ? 'var(--shadow-xs)' : 'none',
              transition: 'background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)',
            }}>
            {t.icon && <span style={{ display: 'inline-flex' }}>{t.icon}</span>}
            {t.label}
            {t.count != null && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 'var(--radius-pill)', background: on ? 'var(--blue-50)' : 'var(--gray-200)', color: on ? 'var(--color-primary)' : 'var(--text-muted)' }}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
