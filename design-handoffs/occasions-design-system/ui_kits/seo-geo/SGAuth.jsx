// ABC SEO/GEO — Block 5: Login + Subscription paywall (standalone, pre-auth).
// Billing brokered through GoHighLevel. Toggles between Sign-in and Plans.
(function () {
  const { Icon } = window.SGIcons;

  const BULLETS = [
    { icon: 'trending-up', t: 'Track rankings & site health', d: 'Every keyword, page, and crawl issue in one place.' },
    { icon: 'sparkles', t: 'See how AI engines recommend you', d: 'Visibility inside ChatGPT, Perplexity, Gemini & more.', ai: true },
    { icon: 'check', t: 'Plain-English fixes, prioritized', d: 'No SEO degree required — just do the next thing.' },
  ];

  function BrandPanel() {
    return (
      <div style={{ flex: '1 1 46%', minWidth: 320, background: 'var(--sg-grad-navy)', color: '#fff', padding: '48px 52px',
        display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -40, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.40), transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -60, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.30), transparent 70%)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 11, position: 'relative' }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--sg-grad-brand)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37,99,235,0.5)' }}>
            <Icon name="play" size={16} color="#fff" />
          </span>
          <div style={{ fontFamily: 'var(--sg-font-logo)', fontWeight: 600, fontSize: 18 }}>ABC <span style={{ color: 'var(--sg-violet-500)' }}>SEO/GEO</span></div>
        </div>

        <div style={{ margin: 'auto 0', position: 'relative' }}>
          <h1 style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 700, fontSize: 40, lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 16px', maxWidth: 460 }}>
            See your business the way <span style={{ color: 'var(--sg-violet-500)' }}>AI sees it.</span>
          </h1>
          <p style={{ fontSize: 15.5, color: 'rgba(226,232,240,0.78)', lineHeight: 1.55, margin: '0 0 36px', maxWidth: 440 }}>
            The first platform that tracks classic SEO and your visibility inside AI answer engines — together.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 440 }}>
            {BULLETS.map((b) => (
              <div key={b.t} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ width: 38, height: 38, borderRadius: 11, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: b.ai ? 'rgba(139,92,246,0.22)' : 'rgba(255,255,255,0.10)', color: b.ai ? 'var(--sg-violet-500)' : '#fff' }}>
                  <Icon name={b.icon} size={18} strokeWidth={2.2} />
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>{b.t}</div>
                  <div style={{ fontSize: 13, color: 'rgba(226,232,240,0.66)', marginTop: 3, lineHeight: 1.45 }}>{b.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', fontSize: 12, color: 'rgba(148,163,184,0.7)' }}>4,000+ Canadian businesses tracked</div>
      </div>
    );
  }

  function SgInput({ label, type, placeholder, value, onChange }) {
    const [focus, setFocus] = React.useState(false);
    return (
      <label style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--sg-text)', marginBottom: 7 }}>{label}</span>
        <input type={type} placeholder={placeholder} value={value} onChange={onChange} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ width: '100%', height: 46, padding: '0 14px', borderRadius: 'var(--sg-radius-md)', fontFamily: 'var(--sg-font-sans)', fontSize: 14,
            color: 'var(--sg-text)', background: 'var(--sg-card)', border: `1px solid ${focus ? 'var(--sg-blue-500)' : 'var(--sg-border)'}`,
            outline: 'none', boxShadow: focus ? 'var(--sg-ring)' : 'none', transition: 'all 140ms var(--sg-ease)' }} />
      </label>
    );
  }

  function LoginForm({ onPlans }) {
    const [email, setEmail] = React.useState('al@the4sale.com');
    const [pw, setPw] = React.useState('');
    return (
      <div style={{ flex: '1 1 54%', minWidth: 340, background: 'var(--sg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h2 style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em', color: 'var(--sg-text)', margin: '0 0 6px' }}>Welcome back</h2>
          <p style={{ fontSize: 14, color: 'var(--sg-text-2)', margin: '0 0 28px' }}>Sign in to your SEO + GEO dashboard.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SgInput label="Work email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sg-text)' }}>Password</span>
                <a style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sg-blue-600)', cursor: 'pointer', textDecoration: 'none' }}>Forgot?</a>
              </div>
              <SgInput type="password" placeholder="••••••••" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
          </div>

          <button style={{ width: '100%', height: 48, marginTop: 22, border: 'none', borderRadius: 'var(--sg-radius-pill)', cursor: 'pointer',
            fontFamily: 'var(--sg-font-sans)', fontWeight: 700, fontSize: 15, color: '#fff', background: 'var(--sg-grad-brand)', boxShadow: '0 4px 14px rgba(37,99,235,0.32)' }}>
            Sign in
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <span style={{ flex: 1, height: 1, background: 'var(--sg-border)' }} />
            <span style={{ fontSize: 12, color: 'var(--sg-text-3)' }}>or</span>
            <span style={{ flex: 1, height: 1, background: 'var(--sg-border)' }} />
          </div>

          <button style={{ width: '100%', height: 48, border: '1px solid var(--sg-border)', borderRadius: 'var(--sg-radius-pill)', cursor: 'pointer',
            fontFamily: 'var(--sg-font-sans)', fontWeight: 700, fontSize: 14, color: 'var(--sg-text)', background: 'var(--sg-card)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon name="zap" size={16} color="var(--sg-violet-600)" /> Email me a magic link
          </button>

          <p style={{ textAlign: 'center', fontSize: 13.5, color: 'var(--sg-text-2)', marginTop: 26 }}>
            New here? <a onClick={onPlans} style={{ fontWeight: 700, color: 'var(--sg-blue-600)', cursor: 'pointer' }}>See plans →</a>
          </p>
          <div style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--sg-text-3)', marginTop: 30 }}>Powered by AI Biz Connect</div>
        </div>
      </div>
    );
  }

  /* ── pricing ── */
  const TIERS = [
    { name: 'Starter', tagline: 'For solo owners getting started', m: 29, popular: false,
      features: ['Monthly site audit', 'GEO AI-Visibility score', 'Up to 25 tracked keywords', '1 site / project', 'Email support'] },
    { name: 'Growth', tagline: 'For businesses serious about growth', m: 79, popular: true,
      features: ['Everything in Starter', 'Weekly audits + rank tracking', 'Up to 250 keywords', 'Competitor tracking', 'Full GEO action plans', 'Priority support'] },
    { name: 'Agency', tagline: 'For agencies & multi-site teams', m: 199, popular: false,
      features: ['Everything in Growth', 'Unlimited sites & keywords', 'White-label client reports', 'Team seats & roles', 'API access', 'Dedicated manager'] },
  ];
  function Pricing({ onBack }) {
    const [annual, setAnnual] = React.useState(true);
    return (
      <div style={{ minHeight: '100vh', width: '100%', background: 'var(--sg-page)', padding: '40px 24px 56px', overflowY: 'auto' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 26 }}>
            <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--sg-grad-brand)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="play" size={14} color="#fff" /></span>
            <div style={{ fontFamily: 'var(--sg-font-logo)', fontWeight: 600, fontSize: 17, color: 'var(--sg-text)' }}>ABC <span style={{ color: 'var(--sg-violet-600)' }}>SEO/GEO</span></div>
            <a onClick={onBack} style={{ marginLeft: 'auto', fontSize: 13.5, fontWeight: 600, color: 'var(--sg-blue-600)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>← Back to sign in</a>
          </div>

          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <h1 style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 700, fontSize: 34, letterSpacing: '-0.02em', color: 'var(--sg-text)', margin: '0 0 10px' }}>Choose your plan</h1>
            <p style={{ fontSize: 15, color: 'var(--sg-text-2)', margin: '0 0 22px' }}>Track SEO and AI visibility together. Cancel anytime.</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--sg-card)', border: '1px solid var(--sg-border)', borderRadius: 'var(--sg-radius-pill)', padding: 4 }}>
              {[['monthly', false], ['annual', true]].map(([label, val]) => (
                <button key={label} onClick={() => setAnnual(val)} style={{ height: 34, padding: '0 18px', border: 'none', borderRadius: 'var(--sg-radius-pill)', cursor: 'pointer', textTransform: 'capitalize',
                  fontFamily: 'var(--sg-font-sans)', fontWeight: 600, fontSize: 13, background: annual === val ? 'var(--sg-grad-brand)' : 'transparent', color: annual === val ? '#fff' : 'var(--sg-text-2)' }}>
                  {label}{label === 'annual' && <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.9 }}>−20%</span>}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, alignItems: 'start' }}>
            {TIERS.map((t) => {
              const price = annual ? Math.round(t.m * 0.8) : t.m;
              return (
                <div key={t.name} style={{ background: 'var(--sg-card)', borderRadius: 'var(--sg-radius-lg)', overflow: 'hidden',
                  border: t.popular ? '2px solid var(--sg-violet-600)' : '1px solid var(--sg-border)',
                  boxShadow: t.popular ? 'var(--sg-shadow-lg)' : 'var(--sg-shadow)', transform: t.popular ? 'translateY(-6px)' : 'none', position: 'relative' }}>
                  {t.popular && <div style={{ background: 'var(--sg-grad-violet)', color: '#fff', textAlign: 'center', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '7px 0' }}>Most popular</div>}
                  <div style={{ padding: 26 }}>
                    <div style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 700, fontSize: 20, color: 'var(--sg-text)' }}>{t.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--sg-text-2)', marginTop: 4, marginBottom: 18 }}>{t.tagline}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span className="sg-tnum" style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 700, fontSize: 40, letterSpacing: '-0.02em', color: 'var(--sg-text)' }}>${price}</span>
                      <span style={{ fontSize: 14, color: 'var(--sg-text-3)' }}>/mo CAD</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--sg-text-3)', margintop: 4, minHeight: 16 }}>{annual ? 'billed annually' : 'billed monthly'}</div>

                    <button style={{ width: '100%', height: 46, margin: '20px 0 22px', border: t.popular ? 'none' : '1px solid var(--sg-border-2)', borderRadius: 'var(--sg-radius-pill)', cursor: 'pointer',
                      fontFamily: 'var(--sg-font-sans)', fontWeight: 700, fontSize: 14.5,
                      color: t.popular ? '#fff' : 'var(--sg-text)', background: t.popular ? 'var(--sg-grad-violet)' : 'var(--sg-card)',
                      boxShadow: t.popular ? '0 6px 16px rgba(124,58,237,0.32)' : 'none' }}>
                      {t.name === 'Agency' ? 'Talk to sales' : 'Start free trial'}
                    </button>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {t.features.map((f) => (
                        <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, color: 'var(--sg-text)' }}>
                          <Icon name="check" size={17} color={t.popular ? 'var(--sg-violet-600)' : 'var(--sg-green)'} strokeWidth={2.6} style={{ flex: 'none', marginTop: 1 }} />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--sg-text-3)', marginTop: 26, display: 'inline-flex', gap: 6, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
            <Icon name="check" size={13} color="var(--sg-green)" /> Secure billing handled by GoHighLevel · 14-day free trial · no card to start
          </div>
        </div>
      </div>
    );
  }

  function Auth() {
    const [view, setView] = React.useState('login');
    if (view === 'plans') return <Pricing onBack={() => setView('login')} />;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexWrap: 'wrap' }}>
        <BrandPanel />
        <LoginForm onPlans={() => setView('plans')} />
      </div>
    );
  }

  window.SGAuth = Auth;
})();
