import React from 'react';

const SIZES = { xs: 24, sm: 32, md: 40, lg: 52, xl: 72 };

function initials(name = '') {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '?';
}

export function Avatar({ name = '', src, size = 'md', status, style, ...rest }) {
  const dim = SIZES[size] || SIZES.md;
  const fontSize = Math.round(dim * 0.4);
  const statusColor = { online: 'var(--success)', away: 'var(--warning)', offline: 'var(--gray-400)' }[status];

  return (
    <span style={{ position: 'relative', display: 'inline-flex', flex: 'none', ...style }} {...rest}>
      <span style={{
        width: dim, height: dim, borderRadius: '50%', overflow: 'hidden',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: src ? 'var(--gray-200)' : 'var(--gradient-brand)',
        color: 'var(--white)', fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)',
        fontSize, letterSpacing: '0.01em', userSelect: 'none',
      }}>
        {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(name)}
      </span>
      {statusColor && (
        <span style={{
          position: 'absolute', right: 0, bottom: 0,
          width: Math.max(8, dim * 0.26), height: Math.max(8, dim * 0.26),
          borderRadius: '50%', background: statusColor, border: '2px solid var(--surface-card)',
        }} />
      )}
    </span>
  );
}
