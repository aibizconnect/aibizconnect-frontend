// ABC SEO/GEO — shared UI primitives. IIFE-isolated; exposed via window.SGKit.
// Reused across every app screen so cards, gauges, deltas stay consistent.
(function () {
  const { Icon } = window.SGIcons;

  function Card({ children, style }) {
    return (
      <div style={{ background: 'var(--sg-card)', border: '1px solid var(--sg-border)',
        borderRadius: 'var(--sg-radius-lg)', boxShadow: 'var(--sg-shadow)', ...style }}>{children}</div>
    );
  }

  function CardHead({ title, sub, ai, right, icon }) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '18px 20px 14px', borderBottom: '1px solid var(--sg-border)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {ai && <Icon name="sparkles" size={16} color="var(--sg-violet-600)" />}
            {icon && !ai && <Icon name={icon} size={16} color="var(--sg-text-2)" />}
            <span style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 600, fontSize: 16, color: 'var(--sg-text)' }}>{title}</span>
          </div>
          {sub && <div style={{ fontSize: 12.5, color: 'var(--sg-text-2)', marginTop: 3 }}>{sub}</div>}
        </div>
        {right}
      </div>
    );
  }

  function Delta({ dir, children }) {
    const map = {
      up: { c: 'var(--sg-green)', bg: 'var(--sg-green-50)', i: 'arrow-up' },
      down: { c: 'var(--sg-red)', bg: 'var(--sg-red-50)', i: 'arrow-down' },
      flat: { c: 'var(--sg-text-2)', bg: 'var(--sg-sunken)', i: 'minus' },
    };
    const m = map[dir] || map.flat;
    return (
      <span className="sg-tnum" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12.5, fontWeight: 700,
        color: m.c, background: m.bg, padding: '3px 9px 3px 7px', borderRadius: 'var(--sg-radius-pill)', whiteSpace: 'nowrap' }}>
        <Icon name={m.i} size={13} strokeWidth={2.6} /> {children}
      </span>
    );
  }

  // Circular progress ring with a big centered number.
  function Gauge({ value, max = 100, color = 'var(--sg-blue-500)', size = 150, stroke = 13, suffix = '/100', big }) {
    const r = (size - stroke) / 2;
    const C = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(1, value / max));
    return (
      <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--sg-sunken)" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 0.9s var(--sg-ease)' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
          <span className="sg-tnum" style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 700, fontSize: big || size * 0.3,
            letterSpacing: '-0.02em', color: 'var(--sg-text)' }}>{value}</span>
          {suffix && <span className="sg-tnum" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sg-text-3)', marginTop: 5 }}>{suffix}</span>}
        </div>
      </div>
    );
  }

  // Tiny sparkline (line + soft fill).
  function Sparkline({ data, color = 'var(--sg-blue-500)', w = 88, h = 30 }) {
    const min = Math.min(...data), max = Math.max(...data), span = max - min || 1;
    const x = (i) => (i * w) / (data.length - 1);
    const y = (v) => h - 3 - ((v - min) / span) * (h - 6);
    const line = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const id = 'spk' + Math.random().toString(36).slice(2, 7);
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  function Bar({ pct, color = 'var(--sg-violet-600)', track = 'var(--sg-violet-50)', height = 8, delay = 0 }) {
    return (
      <div style={{ flex: 1, height, borderRadius: 999, background: track, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', borderRadius: 999, background: color,
          transformOrigin: 'left', animation: 'sg-grow 0.7s var(--sg-ease) both', animationDelay: delay + 's' }} />
      </div>
    );
  }

  // Page header used at the top of every screen.
  function PageHead({ eyebrow, eyebrowColor, title, sub, icon, iconGrad, right }) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          {eyebrow && <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: eyebrowColor || 'var(--sg-blue-600)', marginBottom: 6 }}>{eyebrow}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            {icon && (
              <span style={{ width: 38, height: 38, borderRadius: 11, background: iconGrad || 'var(--sg-grad-brand)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(37,99,235,0.30)' }}>
                <Icon name={icon} size={20} color="#fff" />
              </span>
            )}
            <h1 style={{ margin: 0, fontFamily: 'var(--sg-font-display)', fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em', color: 'var(--sg-text)' }}>{title}</h1>
          </div>
          {sub && <p style={{ margin: '10px 0 0', fontSize: 14, color: 'var(--sg-text-2)', maxWidth: 640, lineHeight: 1.5 }}>{sub}</p>}
        </div>
        {right && <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{right}</div>}
      </div>
    );
  }

  // Date-range pill (visual only).
  function RangeBtn({ label = 'Last 30 days' }) {
    return (
      <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, padding: '0 14px',
        border: '1px solid var(--sg-border)', borderRadius: 'var(--sg-radius-pill)', background: 'var(--sg-card)', cursor: 'pointer',
        fontFamily: 'var(--sg-font-sans)', fontSize: 13.5, fontWeight: 600, color: 'var(--sg-text)' }}>
        <Icon name="calendar" size={16} color="var(--sg-text-2)" /> {label} <Icon name="chevron-down" size={15} color="var(--sg-text-2)" />
      </button>
    );
  }

  function ActionBtn({ children, icon, grad = 'var(--sg-grad-brand)', onClick }) {
    const [h, setH] = React.useState(false);
    return (
      <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, padding: '0 18px', border: 'none',
          borderRadius: 'var(--sg-radius-pill)', cursor: 'pointer', fontFamily: 'var(--sg-font-sans)', fontWeight: 700, fontSize: 14,
          color: '#fff', background: grad, boxShadow: h ? '0 6px 18px rgba(37,99,235,0.40)' : '0 3px 10px rgba(37,99,235,0.26)',
          transform: h ? 'translateY(-1px)' : 'none', transition: 'all 140ms var(--sg-ease)' }}>
        {icon && <Icon name={icon} size={16} />} {children}
      </button>
    );
  }

  window.SGKit = { Card, CardHead, Delta, Gauge, Sparkline, Bar, PageHead, RangeBtn, ActionBtn };
})();
