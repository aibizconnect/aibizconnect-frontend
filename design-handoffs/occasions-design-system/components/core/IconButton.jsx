import React, { useState } from 'react';

const SIZES = { sm: 34, md: 42, lg: 52 };

export function IconButton({
  children, label, variant = 'secondary', size = 'md',
  disabled = false, onClick, style, ...rest
}) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);
  const dim = SIZES[size] || SIZES.md;

  let pal;
  if (variant === 'primary') {
    pal = { background: active ? 'var(--color-primary-active)' : hover ? 'var(--color-primary-hover)' : 'var(--color-primary)', color: 'var(--white)', border: '1px solid transparent', boxShadow: active ? 'none' : 'var(--shadow-brand)' };
  } else if (variant === 'ghost') {
    pal = { background: hover ? 'var(--blue-50)' : 'transparent', color: 'var(--color-primary)', border: '1px solid transparent', boxShadow: 'none' };
  } else {
    pal = { background: hover ? 'var(--gray-50)' : 'var(--surface-card)', color: 'var(--text-body)', border: '1px solid var(--border-default)', boxShadow: active ? 'none' : 'var(--shadow-xs)' };
  }

  return (
    <button
      type="button" aria-label={label} title={label} disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)} onMouseUp={() => setActive(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: dim, height: dim, borderRadius: 'var(--radius-md)', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, padding: 0, flex: 'none',
        transform: active && !disabled ? 'scale(0.95)' : 'none',
        transition: 'background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)',
        ...pal, ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
