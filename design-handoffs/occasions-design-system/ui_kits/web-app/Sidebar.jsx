// Sidebar navigation for the ABC SalesMaster web app.
const { Icon } = window.ABCIcons;

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { id: 'contacts', label: 'Contacts', icon: 'users', badge: '248' },
  { id: 'pipeline', label: 'Pipeline', icon: 'git-branch' },
  { id: 'marketing', label: 'Marketing', icon: 'megaphone' },
  { id: 'website', label: 'Website', icon: 'globe' },
  { id: 'analytics', label: 'Analytics', icon: 'bar-chart' },
];

function NavItem({ item, active, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '0 12px', height: 42,
        border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
        fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)',
        background: active ? 'var(--blue-50)' : hover ? 'var(--gray-50)' : 'transparent',
        color: active ? 'var(--color-primary)' : 'var(--text-body)',
        transition: 'background var(--dur-fast) var(--ease-out)',
      }}>
      <Icon name={item.icon} size={19} strokeWidth={active ? 2.3 : 2} />
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge && (
        <span style={{ fontSize: 11, fontWeight: 700, color: active ? 'var(--color-primary)' : 'var(--text-muted)',
          background: active ? 'var(--white)' : 'var(--gray-100)', padding: '2px 7px', borderRadius: 'var(--radius-pill)' }}>{item.badge}</span>
      )}
    </button>
  );
}

function Sidebar({ active, onNavigate, collapsed }) {
  return (
    <aside style={{
      width: collapsed ? 0 : 244, flex: 'none', background: 'var(--surface-card)',
      borderRight: '1px solid var(--border-subtle)', height: '100%',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      transition: 'width var(--dur-base) var(--ease-out)',
    }}>
      <div style={{ padding: '20px 18px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="../../assets/logo-mark.png" alt="ABC" style={{ width: 30, height: 30 }} />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: 'var(--navy-900)', letterSpacing: '-0.01em' }}>
          ABC <span style={{ color: 'var(--gray-500)', fontWeight: 600 }}>SalesMaster</span>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '6px 12px' }}>
        {NAV.map((n) => <NavItem key={n.id} item={n} active={active === n.id} onClick={() => onNavigate(n.id)} />)}
      </nav>

      <div style={{ marginTop: 'auto', padding: 14 }}>
        <div style={{ background: 'var(--navy-900)', borderRadius: 'var(--radius-lg)', padding: 16, color: 'var(--white)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -18, top: -18, width: 70, height: 70, borderRadius: '50%', background: 'rgba(85,95,196,0.4)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Icon name="sparkles" size={16} color="var(--blue-300)" />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--blue-200)' }}>Pro tip</span>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.85)', marginBottom: 12, position: 'relative' }}>
            Automate follow-ups and recover 8+ hours a week.
          </div>
          <button style={{ width: '100%', height: 34, border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--white)', color: 'var(--navy-900)', fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            Set up automations
          </button>
        </div>
      </div>
    </aside>
  );
}

window.ABCSidebar = Sidebar;
