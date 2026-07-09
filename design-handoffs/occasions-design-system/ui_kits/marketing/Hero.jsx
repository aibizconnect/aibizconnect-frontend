// Marketing site sections for ABC SalesMaster.
const { Icon } = window.ABCIcons;
const { Button, Badge } = window.AIBizConnectDesignSystem_d948fa;

function Nav() {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', height: 68, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="../../assets/logo-mark.png" alt="ABC SalesMaster" style={{ width: 30, height: 30 }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19, color: 'var(--navy-900)', letterSpacing: '-0.01em' }}>ABC <span style={{ color: 'var(--gray-500)' }}>SalesMaster</span></span>
        </div>
        <nav style={{ display: 'flex', gap: 24, marginLeft: 16 }}>
          {['Features', 'Solutions', 'Pricing', 'Customers'].map((l) => (
            <a key={l} href="#" style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-body)', textDecoration: 'none' }}>{l}</a>
          ))}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="#" style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-strong)' }}>Log in</a>
          <Button variant="primary" size="md" rightIcon={<Icon name="arrow-right" size={16} />}>Start free trial</Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', background: 'radial-gradient(1100px 500px at 50% -10%, var(--blue-50), transparent 70%)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 0', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 'var(--radius-pill)', background: 'var(--white)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-xs)', marginBottom: 24 }}>
          <Icon name="sparkles" size={15} color="var(--color-primary)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)' }}>Now with AI-drafted follow-ups</span>
        </div>
        <h1 style={{ fontSize: 60, lineHeight: 1.05, letterSpacing: '-0.03em', color: 'var(--navy-900)', maxWidth: 820, margin: '0 auto', fontWeight: 600 }}>
          Run your whole business from <span style={{ background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>one platform</span>
        </h1>
        <p style={{ fontSize: 20, lineHeight: 1.55, color: 'var(--text-body)', maxWidth: 620, margin: '22px auto 0' }}>
          CRM, marketing automation, a website builder, and analytics — built for solo professionals and small teams who'd rather sell than juggle software.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 32 }}>
          <Button variant="primary" size="lg" rightIcon={<Icon name="arrow-right" size={18} />}>Start free — 14 days</Button>
          <Button variant="secondary" size="lg" leftIcon={<Icon name="play" size={16} />}>Watch demo</Button>
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 16 }}>No credit card required · Cancel anytime</div>
        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div style={{ marginTop: 48, position: 'relative', borderRadius: 'var(--radius-2xl)', background: 'var(--white)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-xl)', padding: 14, maxWidth: 920, marginLeft: 'auto', marginRight: 'auto' }}>
      <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '180px 1fr', minHeight: 320, textAlign: 'left' }}>
        <div style={{ background: 'var(--gray-50)', borderRight: '1px solid var(--border-subtle)', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <img src="../../assets/logo-mark.png" style={{ width: 24, height: 24 }} /><span style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy-900)' }}>SalesMaster</span>
          </div>
          {[['layout-dashboard', 'Dashboard', true], ['users', 'Contacts'], ['git-branch', 'Pipeline'], ['megaphone', 'Marketing'], ['bar-chart', 'Analytics']].map(([ic, l, on]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, marginBottom: 3, background: on ? 'var(--blue-50)' : 'transparent', color: on ? 'var(--color-primary)' : 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>
              <Icon name={ic} size={16} /> {l}
            </div>
          ))}
        </div>
        <div style={{ padding: 20, background: 'var(--surface-card)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
            {[['Pipeline', '$48,920', '+12%'], ['New leads', '327', '+8%'], ['Win rate', '34%', '+3%']].map(([l, v, d]) => (
              <div key={l} style={{ border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{l}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 24, color: 'var(--text-heading)', margin: '4px 0' }}>{v}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green-600)' }}>{d}</div>
              </div>
            ))}
          </div>
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: 'var(--text-heading)' }}>Pipeline by stage</div>
            {[['New', 100, 'var(--blue-300)'], ['Qualified', 64, 'var(--blue-400)'], ['Proposal', 38, 'var(--blue-500)'], ['Won', 30, 'var(--green-500)']].map(([n, w, c]) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ width: 70, fontSize: 12, color: 'var(--text-body)', fontWeight: 600 }}>{n}</span>
                <span style={{ flex: 1, height: 18, background: 'var(--gray-100)', borderRadius: 5, overflow: 'hidden' }}><span style={{ display: 'block', width: w + '%', height: '100%', background: c }} /></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.ABCNav = Nav;
window.ABCHero = Hero;
