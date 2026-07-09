// ABC SEO/GEO — Block 4: Keywords / Rank Tracking.
(function () {
  const { Icon } = window.SGIcons;
  const { Card, CardHead, Delta, Sparkline, PageHead } = window.SGKit;

  /* summary stats */
  const SUMMARY = [
    { label: 'Tracked keywords', value: '240' },
    { label: 'Top 3 positions', value: '28', accent: 'var(--sg-green)' },
    { label: 'Top 10', value: '64' },
    { label: 'Avg. position', value: '14.2', delta: '1.3', dir: 'up' },
    { label: 'Est. traffic value', value: '$3,180', mono: true },
  ];
  function SummaryRow() {
    return (
      <Card style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', overflow: 'hidden' }}>
        {SUMMARY.map((s, i) => (
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

  /* position distribution stacked bar */
  const DIST = [
    { label: '1–3', n: 28, color: 'var(--sg-green)' },
    { label: '4–10', n: 36, color: 'var(--sg-blue-500)' },
    { label: '11–20', n: 62, color: 'var(--sg-blue-300, #7C84D6)' },
    { label: '21–50', n: 78, color: 'var(--sg-amber)' },
    { label: '50+', n: 36, color: 'var(--sg-text-3)' },
  ];
  function Distribution() {
    const total = DIST.reduce((a, d) => a + d.n, 0);
    return (
      <Card>
        <CardHead title="Position distribution" sub="Where your 240 keywords rank on Google" />
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', height: 16, borderRadius: 999, overflow: 'hidden', background: 'var(--sg-sunken)' }}>
            {DIST.map((d, i) => (
              <div key={d.label} title={`${d.label}: ${d.n}`} style={{ width: (d.n / total * 100) + '%', background: d.color,
                transformOrigin: 'left', animation: 'sg-grow 0.6s var(--sg-ease) both', animationDelay: (i * 0.08) + 's' }} />
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 22px', marginTop: 16 }}>
            {DIST.map((d) => (
              <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: d.color }} />
                <span style={{ fontSize: 12.5, color: 'var(--sg-text-2)' }}>Pos {d.label}</span>
                <span className="sg-tnum" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sg-text)' }}>{d.n}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  /* keyword difficulty chip */
  function KD({ v }) {
    const c = v >= 70 ? 'var(--sg-red)' : v >= 40 ? 'var(--sg-amber)' : 'var(--sg-green)';
    const bg = v >= 70 ? 'var(--sg-red-50)' : v >= 40 ? 'var(--sg-amber-50)' : 'var(--sg-green-50)';
    return <span className="sg-tnum" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 34, height: 24, padding: '0 8px', fontSize: 12.5, fontWeight: 700, color: c, background: bg, borderRadius: 'var(--sg-radius-sm)' }}>{v}</span>;
  }
  /* SERP feature icons */
  function Serp({ features }) {
    const map = {
      ai: { icon: 'sparkles', c: 'var(--sg-violet-600)', bg: 'var(--sg-violet-100)', title: 'AI Overview' },
      map: { icon: 'target', c: 'var(--sg-blue-600)', bg: 'var(--sg-blue-50)', title: 'Map Pack' },
      snippet: { icon: 'file-text', c: 'var(--sg-text-2)', bg: 'var(--sg-sunken)', title: 'Featured Snippet' },
    };
    return (
      <div style={{ display: 'flex', gap: 5 }}>
        {features.map((f) => {
          const m = map[f];
          return <span key={f} title={m.title} style={{ width: 24, height: 24, borderRadius: 6, background: m.bg, color: m.c, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={m.icon} size={13} strokeWidth={2.2} /></span>;
        })}
      </div>
    );
  }

  const KEYWORDS = [
    { kw: 'real estate deals toronto', pos: 3, d: 2, dir: 'up', vol: '8,100', kd: 64, cpc: '$3.40', serp: ['ai', 'map'], spark: [9, 8, 7, 6, 5, 4, 3], ai: true },
    { kw: 'foreclosure listings ontario', pos: 7, d: 1, dir: 'down', vol: '5,400', kd: 71, cpc: '$2.90', serp: ['ai', 'snippet'], spark: [5, 5, 6, 6, 7, 6, 7], ai: true },
    { kw: 'buy distressed property canada', pos: 12, d: 4, dir: 'up', vol: '2,200', kd: 48, cpc: '$4.10', serp: ['snippet'], spark: [18, 16, 15, 14, 13, 13, 12] },
    { kw: 'the4sale reviews', pos: 1, d: 0, dir: 'flat', vol: '1,300', kd: 12, cpc: '$0.80', serp: ['ai'], spark: [1, 1, 1, 1, 1, 1, 1], ai: true },
    { kw: 'property investment platform', pos: 18, d: 3, dir: 'up', vol: '3,600', kd: 58, cpc: '$5.20', serp: ['map', 'snippet'], spark: [24, 23, 22, 21, 20, 19, 18] },
    { kw: 'homes for sale gta under market', pos: 24, d: 2, dir: 'down', vol: '4,800', kd: 66, cpc: '$3.10', serp: ['ai', 'map'], spark: [20, 21, 21, 22, 23, 23, 24], ai: true },
  ];
  function KwRow({ r, last }) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 96px 96px 64px 78px 92px 90px', alignItems: 'center', gap: 12, padding: '13px 20px', borderBottom: last ? 'none' : '1px solid var(--sg-border)' }}>
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
        <span className="sg-tnum" style={{ fontSize: 13, color: 'var(--sg-text-2)' }}>{r.vol}</span>
        <KD v={r.kd} />
        <span className="sg-tnum" style={{ fontSize: 13, color: 'var(--sg-text-2)' }}>{r.cpc}</span>
        <Serp features={r.serp} />
        <Sparkline data={r.spark.map((v) => -v)} color={r.dir === 'down' ? 'var(--sg-red)' : 'var(--sg-green)'} w={80} h={26} />
      </div>
    );
  }

  /* keyword ideas */
  const IDEAS = [
    { kw: 'pre-construction condos toronto', vol: '6,600', kd: 52 },
    { kw: 'how to sell house fast ontario', vol: '3,900', kd: 41 },
    { kw: 'best real estate platform canada', vol: '2,400', kd: 47 },
    { kw: 'rent to own homes gta', vol: '5,100', kd: 55 },
  ];
  function Ideas() {
    return (
      <Card>
        <CardHead ai title="Keyword ideas" sub="Untapped searches you could rank for" />
        <div style={{ padding: '6px 12px 14px' }}>
          {IDEAS.map((k, i) => {
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 8px', borderBottom: i < IDEAS.length - 1 ? '1px solid var(--sg-border)' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--sg-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.kw}</div>
                  <div className="sg-tnum" style={{ fontSize: 11.5, color: 'var(--sg-text-3)', marginTop: 2 }}>{k.vol} / mo · KD {k.kd}</div>
                </div>
                <button aria-label="Add" style={{ width: 28, height: 28, flex: 'none', borderRadius: 8, border: '1px solid var(--sg-border)', background: 'var(--sg-card)', cursor: 'pointer', color: 'var(--sg-blue-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={15} /></button>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  function Keywords() {
    return (
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PageHead eyebrow="Research" title="Keywords" icon="key" sub="Track your Google rankings and spot the SEO ↔ AI crossover."
          right={(
            <div style={{ display: 'inline-flex', background: 'var(--sg-sunken)', border: '1px solid var(--sg-border)', borderRadius: 'var(--sg-radius-pill)', padding: 3 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', fontSize: 13, fontWeight: 600, color: 'var(--sg-text)', background: 'var(--sg-card)', borderRadius: 'var(--sg-radius-pill)', boxShadow: 'var(--sg-shadow)' }}><Icon name="globe" size={15} color="var(--sg-text-2)" /> Canada</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 14px', fontSize: 13, fontWeight: 600, color: 'var(--sg-text-2)' }}>Mobile</span>
            </div>
          )} />

        {/* search box */}
        <Card style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, height: 44, padding: '0 14px', background: 'var(--sg-sunken)', border: '1px solid var(--sg-border)', borderRadius: 'var(--sg-radius-pill)' }}>
            <Icon name="search" size={18} color="var(--sg-text-3)" />
            <input placeholder="Enter a keyword or domain…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--sg-font-sans)', fontSize: 14, color: 'var(--sg-text)' }} />
          </div>
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 20px', border: 'none', borderRadius: 'var(--sg-radius-pill)', cursor: 'pointer', fontFamily: 'var(--sg-font-sans)', fontWeight: 700, fontSize: 14, color: '#fff', background: 'var(--sg-grad-brand)', boxShadow: '0 3px 10px rgba(37,99,235,0.26)' }}>
            <Icon name="plus" size={16} /> Add keywords
          </button>
        </Card>

        <SummaryRow />
        <Distribution />

        <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 20, alignItems: 'start' }}>
          <Card>
            <CardHead title="Tracked keywords" sub="Violet AI badge = you also appear in AI Overviews" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 96px 96px 64px 78px 92px 90px', gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--sg-border)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sg-text-3)' }}>
              <span>Keyword</span><span>Position</span><span>Volume</span><span>KD</span><span>CPC</span><span>SERP</span><span>Trend</span>
            </div>
            {KEYWORDS.map((r, i) => <KwRow key={i} r={r} last={i === KEYWORDS.length - 1} />)}
          </Card>
          <Ideas />
        </div>
      </div>
    );
  }

  window.SGKeywords = Keywords;
})();
