// Marketing site — features, industries, pricing, CTA, footer.
const { Icon: MIcon } = window.ABCIcons;
const { Button: MButton, Badge: MBadge } = window.AIBizConnectDesignSystem_d948fa;

const FEATURES = [
  { icon: 'users', title: 'CRM & contacts', body: 'Every lead, client, and conversation in one organized place — with reminders so nothing slips.' },
  { icon: 'megaphone', title: 'Marketing automation', body: 'Email & SMS sequences that nurture leads on autopilot and book more meetings for you.' },
  { icon: 'globe', title: 'Website & booking', body: 'Launch a branded site and self-scheduling pages in minutes. No developer required.' },
  { icon: 'bar-chart', title: 'Analytics', body: 'See pipeline velocity, campaign ROI, and revenue trends at a glance — not in a spreadsheet.' },
];

const INDUSTRIES = ['Law firms', 'Insurance agencies', 'Investment advisors', 'Real estate'];

const PLANS = [
  { name: 'Starter', price: '$29', tag: 'Solo professionals', features: ['1 user', 'CRM + 500 contacts', 'Email campaigns', 'Booking page'], cta: 'Start free', highlight: false },
  { name: 'Professional', price: '$79', tag: 'Growing practices', features: ['Up to 5 users', 'Unlimited contacts', 'Email + SMS automation', 'Website builder', 'Analytics dashboard'], cta: 'Start free trial', highlight: true },
  { name: 'Business', price: '$149', tag: 'Established teams', features: ['Unlimited users', 'Advanced automations', 'Custom reporting', 'Priority support', 'API access'], cta: 'Contact sales', highlight: false },
];

function Section({ children, style }) {
  return <section style={{ maxWidth: 1200, margin: '0 auto', padding: '88px 24px', ...style }}>{children}</section>;
}

function SectionHead({ eyebrow, title, sub }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 48px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: 12 }}>{eyebrow}</div>
      <h2 style={{ fontSize: 40, letterSpacing: '-0.025em', color: 'var(--navy-900)', fontWeight: 600, lineHeight: 1.1 }}>{title}</h2>
      {sub && <p style={{ fontSize: 18, color: 'var(--text-body)', marginTop: 16, lineHeight: 1.55 }}>{sub}</p>}
    </div>
  );
}

function Trustbar() {
  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--white)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '26px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13.5, color: 'var(--text-muted)', fontWeight: 600 }}>Trusted by 4,000+ small businesses</span>
        {INDUSTRIES.map((i) => (
          <span key={i} style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: 'var(--gray-400)' }}>{i}</span>
        ))}
      </div>
    </div>
  );
}

function Features() {
  return (
    <Section>
      <SectionHead eyebrow="One platform" title="Everything you need to grow" sub="Stop stitching together five tools. ABC SalesMaster replaces your CRM, email marketing, website, and reporting." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20 }}>
        {FEATURES.map((f) => (
          <div key={f.title} style={{ display: 'flex', gap: 16, padding: 26, background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ width: 48, height: 48, flex: 'none', borderRadius: 'var(--radius-lg)', background: 'var(--gradient-brand)', color: 'var(--white)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-brand)' }}>
              <MIcon name={f.icon} size={22} />
            </span>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19, color: 'var(--text-heading)', marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--text-body)' }}>{f.body}</div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Industries() {
  return (
    <div style={{ background: 'var(--gray-50)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
      <Section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: 12 }}>Built for your work</div>
          <h2 style={{ fontSize: 38, letterSpacing: '-0.025em', color: 'var(--navy-900)', fontWeight: 600, lineHeight: 1.12 }}>Tailored to how professionals actually sell</h2>
          <p style={{ fontSize: 17, color: 'var(--text-body)', marginTop: 16, lineHeight: 1.6 }}>From intake to closed deal, ABC SalesMaster fits the way your practice runs — with templates and automations made for client-based businesses.</p>
          <div style={{ marginTop: 24 }}><MButton variant="primary" size="lg" rightIcon={<MIcon name="arrow-right" size={18} />}>See your industry</MButton></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[['building', 'Law firms', 'Matter intake & retainers'], ['file-text', 'Insurance', 'Policy renewals on time'], ['trending-up', 'Advisors', 'Nurture every prospect'], ['home', 'Real estate', 'Listings to closings']].map(([ic, t, s]) => (
            <div key={t} style={{ padding: 22, background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xs)' }}>
              <span style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--blue-50)', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}><MIcon name={ic} size={20} /></span>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--text-heading)' }}>{t}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{s}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Pricing() {
  return (
    <Section>
      <SectionHead eyebrow="Pricing" title="Simple plans that scale with you" sub="Start free for 14 days. No credit card, no setup fees." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, alignItems: 'stretch' }}>
        {PLANS.map((p) => (
          <div key={p.name} style={{ position: 'relative', padding: 28, borderRadius: 'var(--radius-2xl)', background: p.highlight ? 'var(--navy-900)' : 'var(--white)', border: p.highlight ? 'none' : '1px solid var(--border-subtle)', boxShadow: p.highlight ? 'var(--shadow-xl)' : 'var(--shadow-sm)', color: p.highlight ? 'var(--white)' : 'inherit', transform: p.highlight ? 'translateY(-8px)' : 'none' }}>
            {p.highlight && <div style={{ position: 'absolute', top: 20, right: 20 }}><MBadge tone="brand" solid>Most popular</MBadge></div>}
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, color: p.highlight ? 'var(--white)' : 'var(--text-heading)' }}>{p.name}</div>
            <div style={{ fontSize: 13, color: p.highlight ? 'var(--blue-200)' : 'var(--text-muted)', marginTop: 2 }}>{p.tag}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '18px 0' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 44, letterSpacing: '-0.02em', color: p.highlight ? 'var(--white)' : 'var(--navy-900)' }}>{p.price}</span>
              <span style={{ fontSize: 15, color: p.highlight ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}>/mo</span>
            </div>
            <MButton variant={p.highlight ? 'primary' : 'secondary'} fullWidth size="md">{p.cta}</MButton>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 22 }}>
              {p.features.map((f) => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: p.highlight ? 'rgba(255,255,255,0.85)' : 'var(--text-body)' }}>
                  <MIcon name="check" size={16} color={p.highlight ? 'var(--blue-300)' : 'var(--color-primary)'} strokeWidth={2.6} /> {f}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function CTA() {
  return (
    <Section style={{ paddingTop: 20 }}>
      <div style={{ borderRadius: 'var(--radius-2xl)', background: 'var(--gradient-brand)', padding: '60px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-brand)' }}>
        <h2 style={{ fontSize: 38, color: 'var(--white)', fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.1 }}>Spend less time on software,<br />more time closing.</h2>
        <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.85)', marginTop: 14 }}>Join 4,000+ professionals running their business on ABC SalesMaster.</p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 28 }}>
          <MButton variant="secondary" size="lg" rightIcon={<MIcon name="arrow-right" size={18} />}>Start your free trial</MButton>
        </div>
      </div>
    </Section>
  );
}

function Footer() {
  const cols = [
    ['Product', ['Features', 'Pricing', 'Integrations', 'Changelog']],
    ['Solutions', ['Law firms', 'Insurance', 'Advisors', 'Real estate']],
    ['Company', ['About', 'Customers', 'Careers', 'Contact']],
    ['Resources', ['Blog', 'Help center', 'API docs', 'Status']],
  ];
  return (
    <footer style={{ background: 'var(--navy-900)', color: 'rgba(255,255,255,0.7)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 24px 32px', display: 'grid', gridTemplateColumns: '1.6fr repeat(4,1fr)', gap: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <img src="../../assets/logo-mark.png" alt="ABC SalesMaster" style={{ width: 28, height: 28 }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, color: 'var(--white)' }}>ABC <span style={{ color: 'var(--gray-400)' }}>SalesMaster</span></span>
          </div>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, maxWidth: 220 }}>The all-in-one platform for professionals who'd rather sell than juggle software.</p>
        </div>
        {cols.map(([h, links]) => (
          <div key={h}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)', marginBottom: 14, letterSpacing: '0.02em' }}>{h}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {links.map((l) => <a key={l} href="#" style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>{l}</a>)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', padding: '20px 24px', maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <span>© 2026 AIBizConnect, Inc.</span>
        <span style={{ display: 'flex', gap: 20 }}><a href="#" style={{ color: 'inherit' }}>Privacy</a><a href="#" style={{ color: 'inherit' }}>Terms</a></span>
      </div>
    </footer>
  );
}

window.ABCMarketing = function Marketing() {
  return (
    <div>
      <window.ABCNav />
      <window.ABCHero />
      <Trustbar />
      <Features />
      <Industries />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  );
};
