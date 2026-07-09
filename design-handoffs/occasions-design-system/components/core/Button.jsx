import React, { useState } from 'react';

const SIZES = {
  sm: { height: 'var(--control-h-sm)', padding: '0 14px', fontSize: 'var(--text-sm)', gap: '6px', radius: 'var(--radius-sm)' },
  md: { height: 'var(--control-h-md)', padding: '0 18px', fontSize: 'var(--text-sm)', gap: '8px', radius: 'var(--radius-md)' },
  lg: { height: 'var(--control-h-lg)', padding: '0 24px', fontSize: 'var(--text-base)', gap: '8px', radius: 'var(--radius-md)' },
};

function palette(variant, hover, active) {
  switch (variant) {
    case 'secondary':
      return {
        background: hover ? 'var(--gray-50)' : 'var(--surface-card)',
        color: 'var(--text-strong)',
        border: '1px solid var(--border-default)',
        boxShadow: active ? 'none' : 'var(--shadow-xs)',
      };
    case 'ghost':
      return {
        background: hover ? 'var(--blue-50)' : 'transparent',
        color: 'var(--color-primary)',
        border: '1px solid transparent',
        boxShadow: 'none',
      };
    case 'danger':
      return {
        background: active ? 'var(--red-600)' : hover ? '#cf3640' : 'var(--danger)',
        color: 'var(--white)',
        border: '1px solid transparent',
        boxShadow: active ? 'none' : 'var(--shadow-sm)',
      };
    case 'primary':
    default:
      return {
        background: active ? 'var(--color-primary-active)' : hover ? 'var(--color-primary-hover)' : 'var(--color-primary)',
        color: 'var(--color-primary-contrast)',
        border: '1px solid transparent',
        boxShadow: active ? 'none' : 'var(--shadow-brand)',
      };
  }
}

export function Button({
  children, variant = 'primary', size = 'md',
  leftIcon, rightIcon, fullWidth = false, disabled = false, loading = false,
  type = 'button', as = 'button', href, onClick, style, ...rest
}) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);
  const s = SIZES[size] || SIZES.md;
  const pal = palette(variant, hover && !disabled, active && !disabled);
  const Tag = as === 'a' || href ? 'a' : 'button';

  const css = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: s.gap, height: s.height, padding: s.padding, fontSize: s.fontSize,
    fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-snug)', lineHeight: 1, borderRadius: s.radius,
    width: fullWidth ? '100%' : 'auto', cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1, textDecoration: 'none', whiteSpace: 'nowrap',
    transform: active && !disabled ? 'translateY(0.5px) scale(0.99)' : 'none',
    transition: 'background var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)',
    ...pal, ...style,
  };

  return (
    <Tag
      type={Tag === 'button' ? type : undefined} href={href}
      style={css} disabled={Tag === 'button' ? disabled || loading : undefined}
      onClick={disabled || loading ? undefined : onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)} onMouseUp={() => setActive(false)}
      {...rest}
    >
      {loading && <Spinner />}
      {!loading && leftIcon && <span style={{ display: 'inline-flex' }}>{leftIcon}</span>}
      {children}
      {!loading && rightIcon && <span style={{ display: 'inline-flex' }}>{rightIcon}</span>}
    </Tag>
  );
}

function Spinner() {
  return (
    <span style={{
      width: 15, height: 15, borderRadius: '50%',
      border: '2px solid currentColor', borderTopColor: 'transparent',
      display: 'inline-block', animation: 'abc-spin 0.6s linear infinite',
    }}>
      <style>{'@keyframes abc-spin{to{transform:rotate(360deg)}}'}</style>
    </span>
  );
}
