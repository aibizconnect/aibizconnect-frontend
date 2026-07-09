// ABC SEO/GEO — Block 2: Overview Dashboard. SEO + GEO side by side.
(function () {
  const { Icon } = window.SGIcons;
  const { Card, CardHead, Delta, Gauge, Sparkline, Bar, PageHead, RangeBtn } = window.SGKit;

  /* dual hero score */
  function HeroScore({ kind, value, color, grad, delta, title, desc }) {
    return (
      <Card style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 22, animation: 'sg-rise 0.4s var(--sg-ease) both' }}>
        <Gauge value={value} color={color} size={150} suffix="/100" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, background: grad, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={kind === 'geo' ? 'sparkles' : 'trending-up'} size={15} color="#fff" />
            </span>
            <span style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 600, fontSize: 17, color: 'var(--sg-text)' }}>{title}</span>
          </div>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--sg-text-2)', lineHeight: 1.5 }}>{desc}</p>
          <Delta dir="up">{delta} this month</Delta>
        </div>
      </Card>
    );
  }

  /* metric stat card with sparkline */
  const STATS = [
    { label: 'Organic keywords', value: '1,284', icon: 'key', color: 'var(--sg-blue-500)', delta: '6%', dir: 'up', spark: [40, 44, 43, 48, 52, 55, 58, 62] },
    { label: 'Monthly traffic', value: '8,430', icon: 'trending-up', color: 'var(--sg-blue-500)', delta: '3%', dir: 'up', spark: [60, 58, 62, 61, 64, 63, 66, 68] },
    { label: 'Backlinks', value: '412', icon: 'link', color: 'var(--sg-blue-500)', delta: '12', dir: 'up', spark: [30, 33, 35, 34, 38, 40, 44, 47] },
    { label: 'AI mentions', value: '37', icon: 'sparkles', color: 'var(--sg-violet-600)', delta: '9', dir: 'up', spark: [12, 15, 14, 18, 22, 28, 31, 37], ai: true },
  ];
  function StatCard({ s }) {
    return (
      <Card style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: s.ai ? 'var(--sg-violet-50)' : 'var(--sg-blue-50)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={s.icon} size={16} color={s.color} />
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sg-text-2)' }}>{s.label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div className="sg-tnum" style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 700, fontSize: 30, letterSpacing: '-0.02em', color: 'var(--sg-text)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ marginTop: 10 }}><Delta dir={s.dir}>{s.delta}</Delta></div>
          </div>
          <Sparkline data={s.spark} color={s.color} w={84} h={36} />
        </div>
      </Card>
    );
  }

  /* dual-line visibility trend */
  function DualTrend() {
    const seo = [62, 63, 62, 64, 65, 64, 66, 67, 66, 68, 69, 70, 71, 72, 78];
    const geo = [44, 46, 45, 48, 50, 49, 52, 54, 53, 56, 58, 57, 60, 62, 64];
    const W = 620, H = 210, pad = 14;
    const x = (i) => pad + (i * (W - pad * 2)) / (seo.length - 1);
    const y = (v) => H - pad - ((v - 38) / (84 - 38)) * (H - pad * 2);
    const path = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    return (
      <Card>
        <CardHead title="Visibility trend" sub="SEO rankings and AI visibility, last 30 days"
          right={(
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--sg-text-2)' }}><span style={{ width: 12, height: 3, borderRadius: 2, background: 'var(--sg-blue-500)' }} /> SEO</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--sg-text-2)' }}><span style={{ width: 12, height: 3, borderRadius: 2, background: 'var(--sg-violet-600)' }} /> GEO</span>
            </div>
          )} />
        <div style={{ padding: '12px 16px 4px' }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="210" preserveAspectRatio="none" style={{ display: 'block' }}>
            <defs>
              <linearGradient id="sgSeoA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563EB" stopOpacity="0.16" /><stop offset="100%" stopColor="#2563EB" stopOpacity="0" /></linearGradient>
              <linearGradient id="sgGeoA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7C3AED" stopOpacity="0.16" /><stop offset="100%" stopColor="#7C3AED" stopOpacity="0" /></linearGradient>
            </defs>
            {[0, 1, 2, 3].map((g) => <line key={g} x1={pad} x2={W - pad} y1={pad + g * (H - pad * 2) / 3} y2={pad + g * (H - pad * 2) / 3} stroke="var(--sg-border)" strokeWidth="1" strokeDasharray="3 4" />)}
            <path d={`${path(seo)} L${x(seo.length - 1)},${H - pad} L${x(0)},${H - pad} Z`} fill="url(#sgSeoA)" />
            <path d={`${path(geo)} L${x(geo.length - 1)},${H - pad} L${x(0)},${H - pad} Z`} fill="url(#sgGeoA)" />
            <path d={path(seo)} fill="none" stroke="var(--sg-blue-500)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            <path d={path(geo)} fill="none" stroke="var(--sg-violet-600)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={x(seo.length - 1)} cy={y(seo[seo.length - 1])} r="4.5" fill="var(--sg-blue-500)" stroke="#fff" strokeWidth="2.5" />
            <circle cx={x(geo.length - 1)} cy={y(geo[geo.length - 1])} r="4.5" fill="var(--sg-violet-600)" stroke="#fff" strokeWidth="2.5" />
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 14px 10px', fontSize: 11, color: 'var(--sg-text-3)' }}>
            <span>30d ago</span><span>20d</span><span>10d</span><span>Today</span>
          </div>
        </div>
      </Card>
    );
  }

  /* AI engine visibility panel */
  const ENGINES = [
    { name: 'ChatGPT', tag: 'C', color: '#10A37F', share: 71, count: 540 },
    { name: 'Perplexity', tag: 'P', color: '#20808D', share: 58, count: 286 },
    { name: 'Google AI Overviews', tag: 'G', color: '#4285F4', share: 49, count: 244 },
    { name: 'Gemini', tag: 'G', color: '#8E75F0', share: 44, count: 132 },
    { name: 'Copilot', tag: 'C', color: '#0A6ED1', share: 38, count: 82 },
  ];
  function EnginePanel() {
    return (
      <Card>
        <CardHead ai title="AI engine visibility" sub="Mention share across answer engines" />
        <div style={{ padding: '6px 20px 14px' }}>
          {ENGINES.map((e, i) => (
            <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < ENGINES.length - 1 ? '1px solid var(--sg-border)' : 'none' }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: e.color, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, fontFamily: 'var(--sg-font-display)' }}>{e.tag}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sg-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
                  <span className="sg-tnum" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sg-violet-700)' }}>{e.count}</span>
                </div>
                <Bar pct={e.share} delay={0.1 + i * 0.06} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  /* what to fix first */
  const FIXES = [
    { pr: 'var(--sg-red)', t: 'Speed up your biggest landing page', b: 'It loads in 3.8s — slow pages lose rankings and buyers.', tag: 'HIGH · SEO', tagc: 'var(--sg-blue-600)', tagbg: 'var(--sg-blue-50)' },
    { pr: 'var(--sg-violet-600)', t: 'Add an FAQ about foreclosure listings', b: "You're missing from 3 high-intent prompts in ChatGPT.", tag: 'HIGH · GEO', tagc: 'var(--sg-violet-700)', tagbg: 'var(--sg-violet-100)' },
    { pr: 'var(--sg-amber)', t: 'Write meta descriptions for 12 pages', b: 'Better summaries lift click-through from Google results.', tag: 'MED · SEO', tagc: 'var(--sg-blue-600)', tagbg: 'var(--sg-blue-50)' },
    { pr: 'var(--sg-violet-600)', t: 'Collect 5 more cited customer reviews', b: 'Trust signals AI engines read before recommending you.', tag: 'MED · GEO', tagc: 'var(--sg-violet-700)', tagbg: 'var(--sg-violet-100)' },
  ];
  function FixRow({ f, i }) {
    const [h, setH] = React.useState(false);
    return (
      <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 20px', borderBottom: i < FIXES.length - 1 ? '1px solid var(--sg-border)' : 'none',
          background: h ? 'var(--sg-sunken)' : 'transparent', transition: 'background 140ms var(--sg-ease)' }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: f.pr, flex: 'none' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--sg-text)' }}>{f.t}</div>
          <div style={{ fontSize: 12.5, color: 'var(--sg-text-2)', marginTop: 2 }}>{f.b}</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: f.tagc, background: f.tagbg, padding: '4px 9px', borderRadius: 'var(--sg-radius-pill)', flex: 'none' }}>{f.tag}</span>
        <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: 'var(--sg-blue-600)', background: 'none', border: 'none', cursor: 'pointer', flex: 'none' }}>Fix <Icon name="arrow-right" size={15} /></button>
      </div>
    );
  }

  function Dashboard() {
    return (
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PageHead eyebrow="Overview" title="Overview" sub="Your complete SEO + AI-visibility snapshot for the4sale.com." right={<RangeBtn />} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <HeroScore kind="seo" value={78} color="var(--sg-blue-500)" grad="var(--sg-grad-brand)" delta="+4" title="SEO Health Score" desc="Your site is in good shape for Google. A few fixes will push you into the top tier." />
          <HeroScore kind="geo" value={64} color="var(--sg-violet-600)" grad="var(--sg-grad-violet)" delta="+9" title="GEO AI-Visibility Score" desc="AI assistants are starting to recommend you. Keep feeding them clear, citable answers." />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {STATS.map((s) => <StatCard key={s.label} s={s} />)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 20, alignItems: 'start' }}>
          <DualTrend />
          <EnginePanel />
        </div>

        <Card>
          <CardHead title="What to fix first" sub="Prioritized across SEO and AI visibility — biggest wins on top"
            right={<button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--sg-text-2)', background: 'var(--sg-sunken)', border: '1px solid var(--sg-border)', borderRadius: 'var(--sg-radius-pill)', padding: '6px 12px', cursor: 'pointer' }}>View all 18</button>} />
          <div>{FIXES.map((f, i) => <FixRow key={i} f={f} i={i} />)}</div>
        </Card>
      </div>
    );
  }

  window.SGDashboard = Dashboard;
})();
