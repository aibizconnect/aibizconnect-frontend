// App shell — composes sidebar, top bar, routed screens, and overlays.
const { Icon } = window.ABCIcons;
const { Button, Input, Select, Avatar, Badge } = window.AIBizConnectDesignSystem_d948fa;

function Placeholder({ icon, title, body }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '70px 20px', textAlign: 'center' }}>
      <span style={{ width: 60, height: 60, borderRadius: 'var(--radius-xl)', background: 'var(--blue-50)', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={28} />
      </span>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20, color: 'var(--text-heading)' }}>{title}</div>
      <div style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 380, lineHeight: 1.5 }}>{body}</div>
      <Button variant="primary" leftIcon={<Icon name="plus" size={16} />} style={{ marginTop: 4 }}>Get started</Button>
    </div>
  );
}

function NewContactModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(12,14,40,0.45)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20, animation: 'abc-fade 0.18s ease-out' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 460, maxWidth: '100%', background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', overflow: 'hidden', animation: 'abc-pop 0.22s var(--ease-spring)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 22px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, color: 'var(--text-heading)' }}>New contact</div>
          <button onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex' }}><Icon name="x" size={20} /></button>
        </div>
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Input label="First name" placeholder="Jane" />
            <Input label="Last name" placeholder="Doe" />
          </div>
          <Input label="Work email" placeholder="jane@company.com" leftIcon={<Icon name="mail" size={16} />} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Input label="Company" placeholder="Acme LLC" />
            <Select label="Stage" defaultValue="new">
              <option value="new">New</option>
              <option value="qualified">Qualified</option>
              <option value="proposal">Proposal</option>
            </Select>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 22px', borderTop: '1px solid var(--border-subtle)', background: 'var(--gray-50)' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onClose}>Add contact</Button>
        </div>
      </div>
    </div>
  );
}

function ContactDrawer({ contact, onClose }) {
  if (!contact) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(12,14,40,0.45)', backdropFilter: 'blur(2px)', display: 'flex', justifyContent: 'flex-end', zIndex: 50, animation: 'abc-fade 0.18s ease-out' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 420, maxWidth: '100%', height: '100%', background: 'var(--surface-card)', boxShadow: 'var(--shadow-xl)', display: 'flex', flexDirection: 'column', animation: 'abc-slide 0.26s var(--ease-out)' }}>
        <div style={{ padding: 22, background: 'var(--navy-900)', color: 'var(--white)', position: 'relative' }}>
          <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 16, right: 16, border: 'none', background: 'rgba(255,255,255,0.12)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--white)', display: 'inline-flex', padding: 6 }}><Icon name="x" size={18} /></button>
          <Avatar name={contact.name} size="xl" />
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, marginTop: 12 }}>{contact.name}</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{contact.org}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Button variant="primary" size="sm" leftIcon={<Icon name="mail" size={15} />}>Email</Button>
            <Button variant="secondary" size="sm" leftIcon={<Icon name="phone" size={15} />}>Call</Button>
            <Button variant="secondary" size="sm" leftIcon={<Icon name="calendar" size={15} />}>Book</Button>
          </div>
        </div>
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18, overflow: 'auto' }}>
          <Field label="Deal value" value={contact.value} mono />
          <Field label="Email" value={contact.email} />
          <Field label="Owner" value={contact.owner} />
          <Field label="Industry" value={contact.tag} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Recent activity</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Opened proposal · 40m ago', 'Email replied · 2d ago', 'Call logged · 5d ago'].map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13.5, color: 'var(--text-body)', alignItems: 'center' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--blue-400)', flex: 'none' }} />{t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-strong)', fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>{value}</span>
    </div>
  );
}

function App() {
  const [route, setRoute] = React.useState('dashboard');
  const [collapsed, setCollapsed] = React.useState(false);
  const [modal, setModal] = React.useState(false);
  const [contact, setContact] = React.useState(null);

  let screen;
  if (route === 'dashboard') screen = <window.ABCDashboard />;
  else if (route === 'contacts') screen = <window.ABCContacts onOpen={setContact} />;
  else if (route === 'pipeline') screen = <window.ABCPipeline />;
  else if (route === 'marketing') screen = <Placeholder icon="megaphone" title="Marketing campaigns" body="Build email & SMS sequences, broadcasts, and automations that nurture every lead on autopilot." />;
  else if (route === 'website') screen = <Placeholder icon="globe" title="Website builder" body="Launch a branded site and booking pages in minutes — no code, fully connected to your CRM." />;
  else screen = <Placeholder icon="bar-chart" title="Analytics" body="Track pipeline velocity, campaign ROI, and revenue trends across your whole book of business." />;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--surface-page)' }}>
      <window.ABCSidebar active={route} onNavigate={setRoute} collapsed={collapsed} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <window.ABCTopBar active={route} onToggleSidebar={() => setCollapsed((c) => !c)} onNewContact={() => setModal(true)} />
        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>{screen}</main>
      </div>
      <NewContactModal open={modal} onClose={() => setModal(false)} />
      <ContactDrawer contact={contact} onClose={() => setContact(null)} />
    </div>
  );
}

window.ABCApp = App;
