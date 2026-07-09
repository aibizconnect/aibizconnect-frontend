// ABC SEO/GEO — app shell. Composes sidebar, top bar, routed screens.
const { Icon } = window.SGIcons;

const PLACEHOLDERS = {
  settings: { icon: 'settings', title: 'Settings', body: 'Manage projects, team access, integrations, and your white-label branding.' },
};

function Placeholder({ p }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '90px 20px', textAlign: 'center', animation: 'sg-fade 0.3s var(--sg-ease)' }}>
      <span style={{ width: 64, height: 64, borderRadius: 'var(--sg-radius-xl)', background: 'var(--sg-blue-50)', color: 'var(--sg-blue-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={p.icon} size={30} />
      </span>
      <div style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 600, fontSize: 22, color: 'var(--sg-text)' }}>{p.title}</div>
      <div style={{ fontSize: 14, color: 'var(--sg-text-2)', maxWidth: 440, lineHeight: 1.55 }}>{p.body}</div>
      <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 22px', marginTop: 6, border: 'none',
        borderRadius: 'var(--sg-radius-pill)', cursor: 'pointer', fontFamily: 'var(--sg-font-sans)', fontWeight: 700, fontSize: 14,
        color: '#fff', background: 'var(--sg-grad-brand)', boxShadow: '0 4px 14px rgba(37,99,235,0.32)' }}>
        <Icon name="plus" size={16} /> Get started
      </button>
    </div>
  );
}

function SGApp() {
  const [route, setRoute] = React.useState('dashboard');
  const [collapsed, setCollapsed] = React.useState(false);

  let screen;
  if (route === 'dashboard') screen = <window.SGDashboard />;
  else if (route === 'geo') screen = <window.SGGeoVisibility />;
  else if (route === 'audit') screen = <window.SGSiteAudit />;
  else if (route === 'keywords') screen = <window.SGKeywords />;
  else if (route === 'rank') screen = <window.SGRankTracking />;
  else if (route === 'competitors') screen = <window.SGCompetitors />;
  else if (route === 'backlinks') screen = <window.SGBacklinks />;
  else if (route === 'reports') screen = <window.SGReports />;
  else screen = <Placeholder p={PLACEHOLDERS[route]} />;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--sg-page)' }}>
      <window.SGSidebar active={route} onNavigate={setRoute} collapsed={collapsed} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <window.SGTopBar onToggleSidebar={() => setCollapsed((c) => !c)} onNewAudit={() => setRoute('audit')} />
        <main style={{ flex: 1, overflow: 'auto', padding: '26px 28px 48px' }}>{screen}</main>
      </div>
    </div>
  );
}

window.SGApp = SGApp;
