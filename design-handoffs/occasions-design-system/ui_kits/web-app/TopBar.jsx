// Top bar with search, quick actions, notifications and account.
const { Icon } = window.ABCIcons;
const { Avatar, Button } = window.AIBizConnectDesignSystem_d948fa;

const TITLES = {
  dashboard: 'Dashboard', contacts: 'Contacts', pipeline: 'Pipeline',
  marketing: 'Marketing', website: 'Website', analytics: 'Analytics',
};

function TopBar({ active, onToggleSidebar, onNewContact }) {
  return (
    <header style={{
      height: 64, flex: 'none', background: 'var(--surface-card)',
      borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center',
      gap: 16, padding: '0 22px',
    }}>
      <button onClick={onToggleSidebar} aria-label="Toggle menu" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-body)', display: 'inline-flex', padding: 6, borderRadius: 'var(--radius-sm)' }}>
        <Icon name="menu" size={20} />
      </button>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20, color: 'var(--text-heading)', letterSpacing: '-0.02em' }}>{TITLES[active]}</div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 280, height: 40, padding: '0 12px', background: 'var(--gray-50)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
          <Icon name="search" size={17} color="var(--text-muted)" />
          <input placeholder="Search contacts, deals…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-strong)' }} />
          <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '1px 5px' }}>⌘K</kbd>
        </div>
        <button aria-label="Notifications" style={{ position: 'relative', width: 40, height: 40, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', background: 'var(--surface-card)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-body)' }}>
          <Icon name="bell" size={18} />
          <span style={{ position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', border: '2px solid var(--surface-card)' }} />
        </button>
        <Button variant="primary" size="md" leftIcon={<Icon name="plus" size={16} />} onClick={onNewContact}>New contact</Button>
        <Avatar name="Dana Ruiz" size="md" status="online" />
      </div>
    </header>
  );
}

window.ABCTopBar = TopBar;
