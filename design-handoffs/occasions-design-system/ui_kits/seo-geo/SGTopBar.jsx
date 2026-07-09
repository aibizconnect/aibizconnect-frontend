// ABC SEO/GEO — sticky top bar. Site/project selector, search, New Audit, bell, avatar.
const { Icon } = window.SGIcons;

function SiteSelector() {
  const [hover, setHover] = React.useState(false);
  return (
    <button onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, height: 42, padding: '0 12px',
        border: '1px solid var(--sg-border)', borderRadius: 'var(--sg-radius-pill)', cursor: 'pointer',
        background: hover ? 'var(--sg-sunken)' : 'var(--sg-card)', transition: 'background 140ms var(--sg-ease)' }}>
      <span style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--sg-grad-brand)', flex: 'none',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11 }}>4</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--sg-text)' }}>the4sale.com</span>
      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--sg-text-2)',
        background: 'var(--sg-sunken)', border: '1px solid var(--sg-border)', padding: '2px 7px', borderRadius: 'var(--sg-radius-pill)' }}>CA</span>
      <Icon name="chevron-down" size={16} color="var(--sg-text-2)" />
    </button>
  );
}

function SGTopBar({ onToggleSidebar, onNewAudit }) {
  const [btnHover, setBtnHover] = React.useState(false);
  return (
    <header style={{
      height: 64, flex: 'none', background: 'rgba(255,255,255,0.86)', backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--sg-border)', display: 'flex', alignItems: 'center',
      gap: 14, padding: '0 22px', position: 'sticky', top: 0, zIndex: 20,
    }}>
      <button onClick={onToggleSidebar} aria-label="Toggle menu" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--sg-text-2)', display: 'inline-flex', padding: 6, borderRadius: 'var(--sg-radius-sm)' }}>
        <Icon name="menu" size={20} />
      </button>

      <SiteSelector />

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, width: 300, height: 42, padding: '0 14px',
          background: 'var(--sg-sunken)', border: '1px solid var(--sg-border)', borderRadius: 'var(--sg-radius-pill)' }}>
          <Icon name="search" size={17} color="var(--sg-text-3)" />
          <input placeholder="Search keywords, pages, prompts…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--sg-font-sans)', fontSize: 13.5, color: 'var(--sg-text)' }} />
        </div>

        <button onClick={onNewAudit} onMouseEnter={() => setBtnHover(true)} onMouseLeave={() => setBtnHover(false)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, padding: '0 18px', border: 'none',
            borderRadius: 'var(--sg-radius-pill)', cursor: 'pointer', fontFamily: 'var(--sg-font-sans)', fontWeight: 700, fontSize: 14,
            color: '#fff', background: 'var(--sg-grad-brand)', boxShadow: btnHover ? '0 6px 18px rgba(37,99,235,0.42)' : '0 3px 10px rgba(37,99,235,0.30)',
            transform: btnHover ? 'translateY(-1px)' : 'none', transition: 'all 140ms var(--sg-ease)' }}>
          <Icon name="plus" size={16} /> New Audit
        </button>

        <button aria-label="Notifications" style={{ position: 'relative', width: 42, height: 42, border: '1px solid var(--sg-border)', borderRadius: '50%', background: 'var(--sg-card)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sg-text-2)' }}>
          <Icon name="bell" size={18} />
          <span style={{ position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: '50%', background: 'var(--sg-red)', border: '2px solid var(--sg-card)' }} />
        </button>

        <span style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--sg-grad-violet)', flex: 'none',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>AB</span>
      </div>
    </header>
  );
}

window.SGTopBar = SGTopBar;
