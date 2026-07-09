// ABC SEO/GEO — left sidebar. Dark navy gradient, grouped nav, PRO usage card.
const { Icon } = window.SGIcons;

const SG_NAV = [
  { group: 'Overview', items: [
    { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { id: 'geo', label: 'GEO / AI Visibility', icon: 'sparkles', ai: true },
  ] },
  { group: 'Research', items: [
    { id: 'audit', label: 'Site Audit', icon: 'activity' },
    { id: 'keywords', label: 'Keywords', icon: 'key' },
    { id: 'rank', label: 'Rank Tracking', icon: 'list-ordered' },
    { id: 'competitors', label: 'Competitors', icon: 'target' },
    { id: 'backlinks', label: 'Backlinks', icon: 'link' },
  ] },
  { group: 'Deliver', items: [
    { id: 'reports', label: 'Reports', icon: 'file-text' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ] },
];

function SGNavItem({ item, active, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '0 12px', height: 40,
        border: 'none', borderRadius: 'var(--sg-radius-md)', cursor: 'pointer', textAlign: 'left',
        fontFamily: 'var(--sg-font-sans)', fontSize: 14, fontWeight: active ? 600 : 500,
        background: active ? 'rgba(255,255,255,0.13)' : hover ? 'rgba(255,255,255,0.06)' : 'transparent',
        color: active ? '#FFFFFF' : 'rgba(226,232,240,0.78)',
        transition: 'background 140ms var(--sg-ease), color 140ms var(--sg-ease)',
        position: 'relative',
      }}>
      <Icon name={item.icon} size={18} strokeWidth={active ? 2.3 : 2}
        color={item.ai ? 'var(--sg-violet-500)' : 'inherit'} />
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.ai && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: '#C9B6F7',
            background: 'rgba(139,92,246,0.22)', padding: '2px 6px', borderRadius: 'var(--sg-radius-pill)' }}>AI</span>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--sg-violet-500)',
            boxShadow: '0 0 8px rgba(139,92,246,0.9)' }} />
        </span>
      )}
    </button>
  );
}

function SGSidebar({ active, onNavigate, collapsed }) {
  return (
    <aside style={{
      width: collapsed ? 0 : 248, flex: 'none', background: 'var(--sg-grad-navy)',
      height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      transition: 'width 200ms var(--sg-ease)', position: 'relative',
    }}>
      {/* soft violet glow behind the logo, hints at the AI brand */}
      <div style={{ position: 'absolute', top: -40, left: -30, width: 180, height: 180, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.30), transparent 70%)', pointerEvents: 'none' }} />

      {/* Logo */}
      <div style={{ padding: '20px 18px 16px', display: 'flex', alignItems: 'center', gap: 11, position: 'relative' }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--sg-grad-brand)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
          boxShadow: '0 4px 12px rgba(37,99,235,0.45)' }}>
          <Icon name="play" size={15} color="#fff" />
        </span>
        <div style={{ lineHeight: 1.05 }}>
          <div style={{ fontFamily: 'var(--sg-font-logo)', fontWeight: 600, fontSize: 16, color: '#fff', letterSpacing: '-0.01em' }}>
            ABC <span style={{ color: 'var(--sg-violet-500)' }}>SEO/GEO</span>
          </div>
          <div style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '0.14em', color: 'rgba(184,204,247,0.65)', textTransform: 'uppercase', marginTop: 2 }}>SEO + GEO Suite</div>
        </div>
      </div>

      {/* Nav groups */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 12px', overflowY: 'auto', flex: 1 }}>
        {SG_NAV.map((g) => (
          <div key={g.group} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'rgba(148,163,184,0.7)', padding: '4px 12px 4px' }}>{g.group}</div>
            {g.items.map((it) => (
              <SGNavItem key={it.id} item={it} active={active === it.id} onClick={() => onNavigate(it.id)} />
            ))}
          </div>
        ))}
      </nav>

      {/* PRO usage card */}
      <div style={{ padding: 14, position: 'relative' }}>
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 'var(--sg-radius-lg)', padding: 16, color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <Icon name="zap" size={15} color="var(--sg-violet-500)" />
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>Growth Plan</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
              color: '#C9B6F7', background: 'rgba(139,92,246,0.22)', padding: '2px 7px', borderRadius: 'var(--sg-radius-pill)' }}>PRO</span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.72)', marginBottom: 6 }}>AI checks used this month</div>
          <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.12)', overflow: 'hidden', marginBottom: 7 }}>
            <div style={{ width: '74%', height: '100%', borderRadius: 999, background: 'var(--sg-grad-violet)' }} />
          </div>
          <div className="sg-tnum" style={{ fontSize: 11.5, color: 'rgba(226,232,240,0.6)', marginBottom: 12 }}>740 of 1,000</div>
          <button style={{ width: '100%', height: 36, border: 'none', borderRadius: 'var(--sg-radius-pill)',
            background: '#fff', color: 'var(--sg-navy-900)', fontFamily: 'var(--sg-font-sans)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            Upgrade plan
          </button>
        </div>

        {/* User row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, padding: '8px 8px', borderRadius: 'var(--sg-radius-md)', cursor: 'pointer' }}>
          <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--sg-grad-violet)', flex: 'none',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>AB</span>
          <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Al Bolourchi</div>
            <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.8)' }}>Agency Admin</div>
          </div>
          <Icon name="chevron-down" size={16} color="rgba(148,163,184,0.8)" />
        </div>
      </div>
    </aside>
  );
}

window.SGSidebar = SGSidebar;
