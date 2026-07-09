// ABC SEO/GEO — Block 7: Rank Tracking (populated with 90-day history).
(function () {
  const { Icon } = window.SGIcons;
  const { Card, CardHead, Delta, PageHead } = window.SGKit;

  const STATS = [
    { label: 'Tracked keywords', value: '240' },
    { label: 'Improved', value: '38', delta: '38', dir: 'up', accent: 'var(--sg-green)' },
    { label: 'Declined', value: '12', delta: '12', dir: 'down', accent: 'var(--sg-red)' },
    { label: 'Avg. position', value: '14.2', delta: '1.3', dir: 'up' },
    { label: 'Visibility %', value: '1.8%', delta: '0.2', dir: 'up' },
  ];
  function StatRow() {
    return (
      <Card style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', overflow: 'hidden' }}>
        {STATS.map((s, i) => (
          <div key={s.label} style={{ padding: '18px 20px', borderLeft: i ? '1px solid var(--sg-border)' : 'none' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sg-text-2)', marginBottom: 8 }}>{s.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="sg-tnum" style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em', color: s.accent || 'var(--sg-text)', lineHeight: 1 }}>{s.value}</span>
              {s.delta && <Delta dir={s.dir}>{s.delta}</Delta>}
            </div>
          </div>
        ))}
      </Card>
    );
  }

  /* 90-day average-position trend (inverted: up = better) */
  function RankTrend() {
    // average position values (lower = better); chart inverted so improving trends upward
    const data = [19.8, 19.5, 19.6, 18.9, 18.4, 18.6, 17.9, 17.2, 17.5, 16.8, 16.9, 16.1, 15.7, 16.0, 15.2, 14.8, 15.1, 14.9, 14.4, 14.2];
    const W = 760, H = 240, padX = 16, padT = 22, padB = 28;
    const dmin = 13, dmax = 21; // position domain
    const x = (i) => padX + (i * (W - padX * 2)) / (data.length - 1);
    const y = (v) => padT + ((v - dmin) / (dmax - dmin)) * (H - padT - padB); // higher position number -> lower on chart
    const line = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const ann = 12; // annotation index — "Google core update"
    return (
      <Card>
        <CardHead title="Average position — 90 days" sub="Daily Google rank for the4sale.com · higher line = better positions"
          right={<Delta dir="up">1.3</Delta>} />
        <div style={{ padding: '14px 16px 4px', position: 'relative' }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="240" preserveAspectRatio="none" style={{ display: 'block' }}>
            <defs><linearGradient id="sgRankA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563EB" stopOpacity="0.16" /><stop offset="100%" stopColor="#2563EB" stopOpacity="0" /></linearGradient></defs>
            {[0, 1, 2, 3].map((g) => <line key={g} x1={padX} x2={W - padX} y1={padT + g * (H - padT - padB) / 3} y2={padT + g * (H - padT - padB) / 3} stroke="var(--sg-border)" strokeWidth="1" strokeDasharray="3 4" />)}
            <path d={`${line} L${x(data.length - 1)},${H - padB} L${x(0)},${H - padB} Z`} fill="url(#sgRankA)" />
            <path d={line} fill="none" stroke="var(--sg-blue-500)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {/* annotation */}
            <line x1={x(ann)} x2={x(ann)} y1={padT} y2={H - padB} stroke="var(--sg-violet-500)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
            <circle cx={x(ann)} cy={y(data[ann])} r="5" fill="var(--sg-violet-600)" stroke="#fff" strokeWidth="2.5" />
            <circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r="5" fill="var(--sg-blue-500)" stroke="#fff" strokeWidth="2.5" />
          </svg>
          <div style={{ position: 'absolute', left: `calc(${(ann / (data.length - 1)) * 100}% - 10px)`, top: 18, display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--sg-violet-700)', background: 'var(--sg-violet-50)', border: '1px solid var(--sg-violet-200)', borderRadius: 'var(--sg-radius-pill)', padding: '3px 9px', whiteSpace: 'nowrap', transform: 'translateX(-50%)' }}>
            <Icon name="zap" size={11} /> Google core update
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 14px 10px', fontSize: 11, color: 'var(--sg-text-3)' }}>
            <span>90d ago</span><span>60d</span><span>30d</span><span>Today</span>
          </div>
        </div>
      </Card>
    );
  }

  /* position history mini sparkline (inverted: lower pos -> higher line) */
  function PosSpark({ data, dir }) {
    const w = 78, h = 26, min = Math.min(...data), max = Math.max(...data), span = (max - min) || 1;
    const x = (i) => (i * w) / (data.length - 1);
    const y = (v) => 3 + ((v - min) / span) * (h - 6); // higher position number lower on chart
    const line = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}><path d={line} fill="none" stroke={dir === 'down' ? 'var(--sg-red)' : 'var(--sg-green)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  function Serp({ features }) {
    const map = { ai: { icon: 'sparkles', c: 'var(--sg-violet-600)', bg: 'var(--sg-violet-100)' }, map: { icon: 'target', c: 'var(--sg-blue-600)', bg: 'var(--sg-blue-50)' }, snippet: { icon: 'file-text', c: 'var(--sg-text-2)', bg: 'var(--sg-sunken)' } };
    return <div style={{ display: 'flex', gap: 5 }}>{features.map((f) => <span key={f} style={{ width: 23, height: 23, borderRadius: 6, background: map[f].bg, color: map[f].c, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={map[f].icon} size={12} strokeWidth={2.2} /></span>)}</div>;
  }

  const ROWS = [
    { kw: 'real estate deals toronto', pos: 3, d: 2, dir: 'up', best: 2, worst: 9, vol: '8,100', serp: ['ai', 'map'], hist: [9, 8, 7, 6, 5, 4, 3], ai: true },
    { kw: 'the4sale reviews', pos: 1, d: 0, dir: 'flat', best: 1, worst: 2, vol: '1,300', serp: ['ai'], hist: [2, 1, 1, 1, 1, 1, 1], ai: true },
    { kw: 'foreclosure listings ontario', pos: 7, d: 1, dir: 'down', best: 5, worst: 8, vol: '5,400', serp: ['ai', 'snippet'], hist: [5, 5, 6, 6, 7, 6, 7], ai: true },
    { kw: 'homes for sale gta', pos: 9, d: 3, dir: 'up', best: 9, worst: 15, vol: '12,000', serp: ['map'], hist: [15, 14, 13, 12, 11, 10, 9] },
    { kw: 'buy distressed property canada', pos: 12, d: 4, dir: 'up', best: 12, worst: 18, vol: '2,200', serp: ['snippet'], hist: [18, 16, 15, 14, 13, 13, 12] },
    { kw: 'property investment platform', pos: 18, d: 3, dir: 'up', best: 18, worst: 24, vol: '3,600', serp: ['map', 'snippet'], hist: [24, 23, 22, 21, 20, 19, 18] },
    { kw: 'pre-construction condos toronto', pos: 21, d: 2, dir: 'down', best: 17, worst: 21, vol: '6,600', serp: ['ai', 'map'], hist: [17, 18, 18, 19, 20, 20, 21], ai: true },
    { kw: 'rent to own homes gta', pos: 26, d: 5, dir: 'up', best: 26, worst: 34, vol: '5,100', serp: [], hist: [34, 32, 30, 29, 28, 27, 26] },
    { kw: 'sell my house fast ontario', pos: 31, d: 1, dir: 'down', best: 28, worst: 31, vol: '3,900', serp: ['snippet'], hist: [28, 29, 29, 30, 30, 31, 31] },
    { kw: 'luxury homes mississauga', pos: 44, d: 6, dir: 'up', best: 44, worst: 58, vol: '2,800', serp: ['map'], hist: [58, 55, 52, 49, 47, 45, 44] },
  ];
  function RankRow({ r, last }) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 96px 96px 90px 90px', alignItems: 'center', gap: 12, padding: '13px 20px', borderBottom: last ? 'none' : '1px solid var(--sg-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--sg-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.kw}</span>
          {r.ai && <span title="Appears in AI Overviews" style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 700, color: 'var(--sg-violet-700)', background: 'var(--sg-violet-100)', padding: '2px 6px', borderRadius: 'var(--sg-radius-pill)' }}><Icon name="sparkles" size={10} /> AI</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span className="sg-tnum" style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 700, fontSize: 15, color: 'var(--sg-text)' }}>{r.pos}</span>
          {r.dir !== 'flat'
            ? <span className="sg-tnum" style={{ display: 'inline-flex', alignItems: 'center', gap: 1, fontSize: 11.5, fontWeight: 700, color: r.dir === 'up' ? 'var(--sg-green)' : 'var(--sg-red)' }}><Icon name={r.dir === 'up' ? 'arrow-up' : 'arrow-down'} size={11} strokeWidth={2.8} />{r.d}</span>
            : <span style={{ fontSize: 11.5, color: 'var(--sg-text-3)' }}>—</span>}
        </div>
        <PosSpark data={r.hist} dir={r.dir} />
        <span className="sg-tnum" style={{ fontSize: 12.5, color: 'var(--sg-text-2)' }}>{r.best} / {r.worst}</span>
        <span className="sg-tnum" style={{ fontSize: 13, color: 'var(--sg-text-2)' }}>{r.vol}</span>
        <Serp features={r.serp} />
      </div>
    );
  }

  function RankTracking() {
    return (
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PageHead eyebrow="Research" title="Rank Tracking" icon="list-ordered" sub="Daily Google positions for the4sale.com — Canada."
          right={(
            <div style={{ display: 'inline-flex', background: 'var(--sg-sunken)', border: '1px solid var(--sg-border)', borderRadius: 'var(--sg-radius-pill)', padding: 3 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', fontSize: 13, fontWeight: 600, color: 'var(--sg-text)', background: 'var(--sg-card)', borderRadius: 'var(--sg-radius-pill)', boxShadow: 'var(--sg-shadow)' }}><Icon name="globe" size={15} color="var(--sg-text-2)" /> Canada</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 14px', fontSize: 13, fontWeight: 600, color: 'var(--sg-text-2)' }}>Mobile</span>
            </div>
          )} />
        <StatRow />
        <RankTrend />
        <Card>
          <CardHead title="Keyword positions" sub="With 7-day history · violet AI badge = also in AI Overviews" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 96px 96px 90px 90px', gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--sg-border)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sg-text-3)' }}>
            <span>Keyword</span><span>Position</span><span>7-day</span><span>Best / Worst</span><span>Volume</span><span>SERP</span>
          </div>
          {ROWS.map((r, i) => <RankRow key={i} r={r} last={i === ROWS.length - 1} />)}
        </Card>
      </div>
    );
  }

  window.SGRankTracking = RankTracking;
})();
