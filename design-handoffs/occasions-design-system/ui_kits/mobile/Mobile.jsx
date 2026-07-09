// ABC SalesMaster mobile app — screens + bottom tab navigation.
const { Icon } = window.ABCIcons;
const { Badge, Avatar } = window.AIBizConnectDesignSystem_d948fa;

const money = (n) => '$' + n.toLocaleString();

function StatTile({ label, value, delta, up = true }) {
  return (
    <div style={{ flex: 1, background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 14 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, color: 'var(--text-heading)', margin: '4px 0 2px' }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: up ? 'var(--green-600)' : 'var(--red-600)' }}>{delta}</div>
    </div>
  );
}

function HomeScreen() {
  const leads = [
    { name: 'Marcus Lee', org: 'Lee & Co. Realty', stage: 'qualified', tone: 'brand' },
    { name: 'Acme Insurance', org: 'Acme Group', stage: 'proposal', tone: 'warning' },
    { name: 'J. Whitfield', org: 'Whitfield Law', stage: 'new', tone: 'neutral' },
  ];
  return (
    <div style={{ padding: '8px 16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Good morning</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 24, color: 'var(--text-heading)', letterSpacing: '-0.02em' }}>Dana Ruiz</div>
        </div>
        <Avatar name="Dana Ruiz" size="lg" status="online" />
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <StatTile label="Pipeline" value="$48.9k" delta="+12%" />
        <StatTile label="New leads" value="327" delta="+8%" />
      </div>

      <div>
        <SectionTitle title="Today's tasks" action="3 due" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[['Call J. Whitfield', '2:00 PM'], ['Send Acme proposal', '4:30 PM'], ['Follow up · 3 leads', '5:00 PM']].map(([t, w], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
              <span style={{ width: 20, height: 20, borderRadius: 'var(--radius-xs)', border: '1.5px solid var(--border-strong)', flex: 'none' }} />
              <span style={{ flex: 1, fontSize: 14.5, fontWeight: 500, color: 'var(--text-strong)' }}>{t}</span>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{w}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle title="Recent leads" action="View all" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {leads.map((l) => (
            <div key={l.name} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
              <Avatar name={l.name} size="md" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-strong)' }}>{l.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{l.org}</div>
              </div>
              <Badge tone={l.tone} dot>{l.stage}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContactsScreen() {
  const items = [
    { name: 'Octavia Brooks', org: 'Brooks Financial', value: '$31k', tone: 'warning', stage: 'negotiation' },
    { name: 'Acme Insurance', org: 'Acme Group', value: '$22k', tone: 'warning', stage: 'proposal' },
    { name: 'Priya Nair', org: 'Nair Advisory', value: '$14k', tone: 'success', stage: 'won' },
    { name: 'Sunrise Dental', org: 'Sunrise Dental PC', value: '$9.8k', tone: 'brand', stage: 'qualified' },
    { name: 'Marcus Lee', org: 'Lee & Co. Realty', value: '$8.4k', tone: 'brand', stage: 'qualified' },
    { name: 'J. Whitfield', org: 'Whitfield Law', value: '$5k', tone: 'neutral', stage: 'new' },
  ];
  return (
    <div style={{ padding: '4px 16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42, padding: '0 12px', background: 'var(--gray-100)', borderRadius: 'var(--radius-md)', marginBottom: 14 }}>
        <Icon name="search" size={17} color="var(--text-muted)" />
        <span style={{ fontSize: 14.5, color: 'var(--text-muted)' }}>Search contacts</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((c) => (
          <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
            <Avatar name={c.name} size="md" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-strong)' }}>{c.name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{c.org}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>{c.value}</div>
              <div style={{ marginTop: 3 }}><Badge tone={c.tone}>{c.stage}</Badge></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PipelineScreen() {
  const cols = [
    { name: 'New', count: 86, color: 'var(--blue-300)' },
    { name: 'Qualified', count: 41, color: 'var(--blue-400)' },
    { name: 'Proposal', count: 18, color: 'var(--blue-500)' },
    { name: 'Negotiation', count: 9, color: 'var(--blue-600)' },
    { name: 'Won', count: 14, color: 'var(--green-500)' },
  ];
  const max = 86;
  return (
    <div style={{ padding: '8px 16px 20px' }}>
      <div style={{ background: 'var(--navy-900)', borderRadius: 'var(--radius-lg)', padding: 18, color: 'var(--white)', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--blue-200)' }}>Weighted pipeline</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 30, marginTop: 4 }}>$294,000</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>8 active deals · +12% MoM</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {cols.map((c) => (
          <div key={c.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>{c.name}</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.count}</span>
            </div>
            <div style={{ height: 10, background: 'var(--gray-100)', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ width: (c.count / max * 100) + '%', height: '100%', background: c.color, borderRadius: 5 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ title, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--text-heading)' }}>{title}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}>{action}</span>
    </div>
  );
}

const TABS = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'contacts', label: 'Contacts', icon: 'users' },
  { id: 'pipeline', label: 'Pipeline', icon: 'git-branch' },
  { id: 'more', label: 'More', icon: 'menu' },
];

function MobileApp() {
  const [tab, setTab] = React.useState('home');
  const HEADER = { home: 'ABC SalesMaster', contacts: 'Contacts', pipeline: 'Pipeline', more: 'More' };
  let screen;
  if (tab === 'home') screen = <HomeScreen />;
  else if (tab === 'contacts') screen = <ContactsScreen />;
  else if (tab === 'pipeline') screen = <PipelineScreen />;
  else screen = <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Settings, billing & integrations</div>;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface-page)', fontFamily: 'var(--font-sans)' }}>
      {/* App header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '52px 16px 12px' }}>
        <img src="../../assets/logo-mark.png" style={{ width: 26, height: 26 }} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: 'var(--navy-900)' }}>{HEADER[tab]}</span>
        <button style={{ marginLeft: 'auto', width: 36, height: 36, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--surface-card)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-body)', position: 'relative' }}>
          <Icon name="bell" size={18} />
          <span style={{ position: 'absolute', top: 7, right: 8, width: 7, height: 7, borderRadius: '50%', background: 'var(--danger)', border: '2px solid var(--surface-card)' }} />
        </button>
      </div>

      {/* Scrollable screen */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {screen}
      </div>

      {/* FAB */}
      <button style={{ position: 'absolute', right: 20, bottom: 96, width: 56, height: 56, borderRadius: '50%', border: 'none', background: 'var(--gradient-brand)', color: 'var(--white)', boxShadow: 'var(--shadow-brand)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 30 }}>
        <Icon name="plus" size={26} strokeWidth={2.4} />
      </button>

      {/* Bottom tab bar */}
      <div style={{ display: 'flex', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-card)', paddingBottom: 8 }}>
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 0', border: 'none', background: 'transparent', cursor: 'pointer', color: on ? 'var(--color-primary)' : 'var(--text-muted)' }}>
              <Icon name={t.icon} size={22} strokeWidth={on ? 2.3 : 2} />
              <span style={{ fontSize: 11, fontWeight: 600 }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

window.ABCMobileApp = MobileApp;
