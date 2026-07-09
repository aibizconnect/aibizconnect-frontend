// ABC SEO/GEO — GEO / AI Visibility screen. The differentiator: how visible
// the4sale.com is inside AI answer engines. Violet = the AI accent throughout.
const { Icon } = window.SGIcons;

/* ── shared bits ─────────────────────────────────────────────── */
function Card({ children, style }) {
  return (
    <div style={{ background: 'var(--sg-card)', border: '1px solid var(--sg-border)',
      borderRadius: 'var(--sg-radius-lg)', boxShadow: 'var(--sg-shadow)', ...style }}>{children}</div>
  );
}
function CardHead({ title, sub, ai, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '18px 20px 14px', borderBottom: '1px solid var(--sg-border)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {ai && <Icon name="sparkles" size={16} color="var(--sg-violet-600)" />}
          <span style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 600, fontSize: 16, color: 'var(--sg-text)' }}>{title}</span>
        </div>
        {sub && <div style={{ fontSize: 12.5, color: 'var(--sg-text-2)', marginTop: 3 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}
function Delta({ dir, children }) {
  const map = { up: { c: 'var(--sg-green)', bg: 'var(--sg-green-50)', i: 'arrow-up' },
    down: { c: 'var(--sg-red)', bg: 'var(--sg-red-50)', i: 'arrow-down' },
    flat: { c: 'var(--sg-text-2)', bg: 'var(--sg-sunken)', i: 'minus' } };
  const m = map[dir];
  return (
    <span className="sg-tnum" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12.5, fontWeight: 700,
      color: m.c, background: m.bg, padding: '3px 9px 3px 7px', borderRadius: 'var(--sg-radius-pill)' }}>
      <Icon name={m.i} size={13} strokeWidth={2.6} /> {children}
    </span>
  );
}

/* ── KPI cards ───────────────────────────────────────────────── */
function Kpi({ label, value, unit, delta, dir, foot, accent }) {
  return (
    <Card style={{ padding: 18, animation: 'sg-rise 0.4s var(--sg-ease) both' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sg-text-2)' }}>{label}</span>
        {accent && <Icon name="sparkles" size={15} color="var(--sg-violet-600)" />}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span className="sg-tnum" style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 700, fontSize: 36,
          letterSpacing: '-0.02em', color: accent ? 'var(--sg-violet-700)' : 'var(--sg-text)', lineHeight: 1 }}>{value}</span>
        {unit && <span className="sg-tnum" style={{ fontSize: 16, fontWeight: 600, color: 'var(--sg-text-3)' }}>{unit}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
        <Delta dir={dir}>{delta}</Delta>
        <span style={{ fontSize: 12, color: 'var(--sg-text-3)' }}>{foot}</span>
      </div>
    </Card>
  );
}

/* ── engine breakdown ────────────────────────────────────────── */
const ENGINES = [
  { name: 'ChatGPT', tag: 'C', color: '#10A37F', vis: 71, mentions: 540, delta: '+12%', dir: 'up' },
  { name: 'Perplexity', tag: 'P', color: '#20808D', vis: 58, mentions: 286, delta: '+6%', dir: 'up' },
  { name: 'Google AI Overviews', tag: 'G', color: '#4285F4', vis: 49, mentions: 244, delta: '+21%', dir: 'up' },
  { name: 'Gemini', tag: 'G', color: '#8E75F0', vis: 44, mentions: 132, delta: '−4%', dir: 'down' },
  { name: 'Copilot', tag: 'C', color: '#0A6ED1', vis: 38, mentions: 82, delta: '+9%', dir: 'up' },
];
function EngineRow({ e, i }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr 92px', alignItems: 'center', gap: 16, padding: '13px 20px',
      borderBottom: i < ENGINES.length - 1 ? '1px solid var(--sg-border)' : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, background: e.color, flex: 'none',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14,
          fontFamily: 'var(--sg-font-display)' }}>{e.tag}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--sg-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
          <div className="sg-tnum" style={{ fontSize: 11.5, color: 'var(--sg-text-3)' }}>{e.mentions.toLocaleString()} mentions</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--sg-violet-50)', overflow: 'hidden' }}>
          <div style={{ width: e.vis + '%', height: '100%', borderRadius: 999, background: 'var(--sg-grad-violet)',
            transformOrigin: 'left', animation: 'sg-grow 0.7s var(--sg-ease) both', animationDelay: (0.1 + i * 0.07) + 's' }} />
        </div>
        <span className="sg-tnum" style={{ width: 40, textAlign: 'right', fontSize: 13.5, fontWeight: 700, color: 'var(--sg-violet-700)' }}>{e.vis}%</span>
      </div>
      <div style={{ textAlign: 'right' }}><Delta dir={e.dir}>{e.delta.replace(/[+−-]/, '')}</Delta></div>
    </div>
  );
}

/* ── trend area chart ────────────────────────────────────────── */
function TrendChart() {
  const data = [48, 50, 49, 52, 51, 54, 53, 56, 55, 58, 57, 60, 59, 62];
  const W = 560, H = 180, pad = 14;
  const dmin = 42, dmax = 66;
  const x = (i) => pad + (i * (W - pad * 2)) / (data.length - 1);
  const y = (v) => H - pad - ((v - dmin) / (dmax - dmin)) * (H - pad * 2);
  const line = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1).toFixed(1)},${H - pad} L${x(0).toFixed(1)},${H - pad} Z`;
  return (
    <div style={{ padding: '8px 16px 4px' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="180" preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="sgArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((g) => (
          <line key={g} x1={pad} x2={W - pad} y1={pad + g * (H - pad * 2) / 3} y2={pad + g * (H - pad * 2) / 3}
            stroke="var(--sg-border)" strokeWidth="1" strokeDasharray="3 4" />
        ))}
        <path d={area} fill="url(#sgArea)" />
        <path d={line} fill="none" stroke="var(--sg-violet-600)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r="5" fill="var(--sg-violet-600)" stroke="#fff" strokeWidth="2.5" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 14px 6px', fontSize: 11, color: 'var(--sg-text-3)' }}>
        <span>90 days ago</span><span>60d</span><span>30d</span><span>Today</span>
      </div>
    </div>
  );
}

/* ── prompts table ───────────────────────────────────────────── */
const SENT = {
  Positive: { c: 'var(--sg-green)', bg: 'var(--sg-green-50)' },
  Neutral: { c: 'var(--sg-text-2)', bg: 'var(--sg-sunken)' },
  Mixed: { c: 'var(--sg-amber)', bg: 'var(--sg-amber-50)' },
  Missing: { c: 'var(--sg-red)', bg: 'var(--sg-red-50)' },
};
const PROMPTS = [
  { q: 'best real estate deals in the GTA', engines: ['#10A37F', '#20808D', '#8E75F0'], pos: '#2', sent: 'Positive' },
  { q: 'how to find foreclosure listings in Ontario', engines: ['#10A37F', '#4285F4'], pos: '#4', sent: 'Neutral' },
  { q: 'trusted property investment platforms in Canada', engines: ['#20808D'], pos: '#6', sent: 'Mixed' },
  { q: 'the4sale.com reviews — is it legit?', engines: ['#10A37F', '#0A6ED1', '#8E75F0'], pos: '#1', sent: 'Positive' },
  { q: 'where to buy distressed properties in Toronto', engines: [], pos: '—', sent: 'Missing' },
];
function PromptRow({ r, i }) {
  const s = SENT[r.sent];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 64px 96px', alignItems: 'center', gap: 14, padding: '13px 20px',
      borderBottom: i < PROMPTS.length - 1 ? '1px solid var(--sg-border)' : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
        <Icon name="message-square" size={15} color="var(--sg-text-3)" />
        <span style={{ fontSize: 13.5, color: 'var(--sg-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{r.q}"</span>
      </div>
      <div style={{ display: 'flex', gap: -4 }}>
        {r.engines.length === 0
          ? <span style={{ fontSize: 12, color: 'var(--sg-text-3)' }}>Not cited</span>
          : r.engines.map((c, k) => (
            <span key={k} style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: '2px solid var(--sg-card)',
              marginLeft: k ? -6 : 0 }} />
          ))}
      </div>
      <span className="sg-tnum" style={{ fontSize: 13.5, fontWeight: 700, color: r.pos === '—' ? 'var(--sg-text-3)' : 'var(--sg-text)' }}>{r.pos}</span>
      <span style={{ justifySelf: 'start', fontSize: 11.5, fontWeight: 700, color: s.c, background: s.bg, padding: '3px 10px', borderRadius: 'var(--sg-radius-pill)' }}>{r.sent}</span>
    </div>
  );
}

/* ── next actions ────────────────────────────────────────────── */
const ACTIONS = [
  { t: 'Add an FAQ about foreclosure listings', d: "You're missing from 3 high-intent prompts buyers actually ask.", impact: 'High' },
  { t: 'Publish a "best platforms" comparison page', d: 'Competitors win this answer in ChatGPT and Perplexity today.', impact: 'High' },
  { t: 'Collect 5 more cited customer reviews', d: 'Trust signals AI engines read before recommending you.', impact: 'Medium' },
];
function ActionItem({ a, i }) {
  const [hover, setHover] = React.useState(false);
  const hi = a.impact === 'High';
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', gap: 12, padding: '14px 16px', borderRadius: 'var(--sg-radius-md)',
        background: hover ? 'var(--sg-violet-50)' : 'transparent', cursor: 'pointer', transition: 'background 140ms var(--sg-ease)' }}>
      <span style={{ width: 28, height: 28, borderRadius: 8, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--sg-violet-100)', color: 'var(--sg-violet-700)', fontWeight: 700, fontSize: 13, fontFamily: 'var(--sg-font-display)' }}>{i + 1}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--sg-text)' }}>{a.t}</span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: hi ? 'var(--sg-violet-700)' : 'var(--sg-text-2)',
            background: hi ? 'var(--sg-violet-100)' : 'var(--sg-sunken)', padding: '2px 7px', borderRadius: 'var(--sg-radius-pill)' }}>{a.impact} impact</span>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--sg-text-2)', marginTop: 3, lineHeight: 1.45 }}>{a.d}</div>
      </div>
      <Icon name="chevron-right" size={18} color={hover ? 'var(--sg-violet-600)' : 'var(--sg-text-3)'} style={{ alignSelf: 'center' }} />
    </div>
  );
}

/* ── screen ──────────────────────────────────────────────────── */
function GeoVisibility() {
  const [range, setRange] = React.useState(false);
  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--sg-violet-600)', marginBottom: 6 }}>Overview</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--sg-grad-violet)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(124,58,237,0.35)' }}>
              <Icon name="sparkles" size={20} color="#fff" />
            </span>
            <h1 style={{ margin: 0, fontFamily: 'var(--sg-font-display)', fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em', color: 'var(--sg-text)' }}>GEO / AI Visibility</h1>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 14, color: 'var(--sg-text-2)', maxWidth: 620, lineHeight: 1.5 }}>
            How often AI assistants mention <strong style={{ color: 'var(--sg-text)' }}>the4sale.com</strong> when Canadians ask about buying and selling property. Higher visibility = more customers find you inside ChatGPT, Perplexity, Gemini & more.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setRange((r) => !r)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, padding: '0 14px',
            border: '1px solid var(--sg-border)', borderRadius: 'var(--sg-radius-pill)', background: 'var(--sg-card)', cursor: 'pointer',
            fontFamily: 'var(--sg-font-sans)', fontSize: 13.5, fontWeight: 600, color: 'var(--sg-text)' }}>
            <Icon name="calendar" size={16} color="var(--sg-text-2)" /> Last 30 days <Icon name="chevron-down" size={15} color="var(--sg-text-2)" />
          </button>
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, padding: '0 18px', border: 'none',
            borderRadius: 'var(--sg-radius-pill)', cursor: 'pointer', fontFamily: 'var(--sg-font-sans)', fontWeight: 700, fontSize: 14,
            color: '#fff', background: 'var(--sg-grad-violet)', boxShadow: '0 4px 14px rgba(124,58,237,0.35)' }}>
            <Icon name="refresh-cw" size={16} /> Run AI check
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <Kpi label="AI Visibility Score" value="62" unit="/100" delta="5 pts" dir="up" foot="up from 57" accent />
        <Kpi label="AI mentions (30d)" value="1,284" delta="18.2%" dir="up" foot="vs prev. 30d" />
        <Kpi label="Share of AI answers" value="23" unit="%" delta="3.1 pts" dir="up" foot="vs 4 competitors" />
        <Kpi label="Avg. answer position" value="#2.8" delta="0.4" dir="up" foot="when cited" />
      </div>

      {/* engines + trend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 20, alignItems: 'start' }}>
        <Card>
          <CardHead ai title="How AI engines see you" sub="Visibility = share of relevant prompts where you're cited"
            right={<button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--sg-violet-700)', background: 'none', border: 'none', cursor: 'pointer' }}>Details <Icon name="chevron-right" size={14} /></button>} />
          <div>{ENGINES.map((e, i) => <EngineRow key={e.name} e={e} i={i} />)}</div>
        </Card>
        <Card>
          <CardHead ai title="Visibility trend" sub="AI Visibility Score over 90 days"
            right={<Delta dir="up">+14</Delta>} />
          <TrendChart />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 20px 16px', padding: '10px 12px', background: 'var(--sg-violet-50)', borderRadius: 'var(--sg-radius-md)' }}>
            <Icon name="trending-up" size={16} color="var(--sg-violet-700)" />
            <span style={{ fontSize: 12.5, color: 'var(--sg-text)' }}>Steady climb — you've gained <strong>14 points</strong> since spring.</span>
          </div>
        </Card>
      </div>

      {/* prompts + actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 20, alignItems: 'start' }}>
        <Card>
          <CardHead title="Prompts where you show up" sub="Real questions Canadians ask AI assistants"
            right={<button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--sg-text-2)', background: 'var(--sg-sunken)', border: '1px solid var(--sg-border)', borderRadius: 'var(--sg-radius-pill)', padding: '6px 12px', cursor: 'pointer' }}><Icon name="external-link" size={13} /> All 124 prompts</button>} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 64px 96px', gap: 14, padding: '10px 20px', borderBottom: '1px solid var(--sg-border)',
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--sg-text-3)' }}>
            <span>Prompt</span><span>Cited in</span><span>Position</span><span>Sentiment</span>
          </div>
          <div>{PROMPTS.map((r, i) => <PromptRow key={i} r={r} i={i} />)}</div>
        </Card>

        <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--sg-border)', background: 'var(--sg-violet-50)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="zap" size={16} color="var(--sg-violet-600)" />
              <span style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 600, fontSize: 16, color: 'var(--sg-text)' }}>What to do next</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--sg-text-2)', marginTop: 3 }}>Plain-English moves that lift your AI visibility fastest.</div>
          </div>
          <div style={{ padding: '8px 6px' }}>{ACTIONS.map((a, i) => <ActionItem key={i} a={a} i={i} />)}</div>
          <div style={{ padding: '4px 16px 18px' }}>
            <button style={{ width: '100%', height: 42, border: '1px solid var(--sg-violet-200)', borderRadius: 'var(--sg-radius-pill)',
              background: 'var(--sg-card)', color: 'var(--sg-violet-700)', fontFamily: 'var(--sg-font-sans)', fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              See full GEO action plan <Icon name="arrow-right" size={16} />
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

window.SGGeoVisibility = GeoVisibility;
