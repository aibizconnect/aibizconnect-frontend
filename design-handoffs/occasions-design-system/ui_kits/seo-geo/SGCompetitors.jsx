// ABC SEO/GEO — Block 8: Competitors (SEO + GEO dual comparison).
(function () {
  const { Icon } = window.SGIcons;
  const { Card, CardHead, PageHead } = window.SGKit;

  const COMPS = [
    { domain: 'the4sale.com', you: true, color: 'var(--sg-blue-500)' },
    { domain: 'realtor.ca', color: '#0A6ED1' },
    { domain: 'zolo.ca', color: '#16A34A' },
    { domain: 'housesigma.com', color: '#F59E0B' },
  ];

  // metric rows: higher is better. value + whether you win/lose vs that competitor
  const ROWS = [
    { metric: 'SEO Visibility', fmt: (v) => v + '%', vals: { you: 41, 'realtor.ca': 92, 'zolo.ca': 68, 'housesigma.com': 57 } },
    { metric: 'Organic keywords', fmt: (v) => v.toLocaleString(), vals: { you: 1284, 'realtor.ca': 184000, 'zolo.ca': 42500, 'housesigma.com': 28900 } },
    { metric: 'Backlinks', fmt: (v) => v.toLocaleString(), vals: { you: 412, 'realtor.ca': 2400000, 'zolo.ca': 88000, 'housesigma.com': 51000 } },
    { metric: 'AI Visibility score', ai: true, fmt: (v) => v + '/100', vals: { you: 64, 'realtor.ca': 58, 'zolo.ca': 49, 'housesigma.com': 71 } },
    { metric: 'AI share of voice', ai: true, fmt: (v) => v + '%', vals: { you: 23, 'realtor.ca': 19, 'zolo.ca': 14, 'housesigma.com': 31 } },
  ];

  function ComparisonTable() {
    const cols = COMPS.map((c) => c.domain);
    const youKey = 'you';
    return (
      <Card style={{ overflow: 'hidden' }}>
        <CardHead title="Head-to-head" sub="Green = you win · red = competitor leads · ✦ rows are AI/GEO" />
        <div style={{ display: 'grid', gridTemplateColumns: '180px repeat(4, 1fr)' }}>
          {/* header */}
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--sg-border)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sg-text-3)' }}>Metric</div>
          {COMPS.map((c) => (
            <div key={c.domain} style={{ padding: '12px 14px', borderBottom: '1px solid var(--sg-border)', borderLeft: '1px solid var(--sg-border)', background: c.you ? 'var(--sg-blue-50)' : 'transparent', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: c.color, flex: 'none' }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: c.you ? 'var(--sg-blue-700)' : 'var(--sg-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.domain}</span>
              {c.you && <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--sg-blue-700)', background: 'var(--sg-card)', padding: '1px 6px', borderRadius: 'var(--sg-radius-pill)' }}>YOU</span>}
            </div>
          ))}
          {/* rows */}
          {ROWS.map((r, ri) => {
            const youVal = r.vals[youKey];
            return (
              <React.Fragment key={r.metric}>
                <div style={{ padding: '14px 18px', borderBottom: ri < ROWS.length - 1 ? '1px solid var(--sg-border)' : 'none', display: 'flex', alignItems: 'center', gap: 7 }}>
                  {r.ai && <Icon name="sparkles" size={14} color="var(--sg-violet-600)" />}
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sg-text)' }}>{r.metric}</span>
                </div>
                {COMPS.map((c) => {
                  const key = c.you ? youKey : c.domain;
                  const v = r.vals[key];
                  let color = 'var(--sg-text)';
                  if (!c.you) { color = youVal >= v ? 'var(--sg-green)' : 'var(--sg-red)'; }
                  return (
                    <div key={c.domain} style={{ padding: '14px', borderLeft: '1px solid var(--sg-border)', borderBottom: ri < ROWS.length - 1 ? '1px solid var(--sg-border)' : 'none', background: c.you ? 'var(--sg-blue-50)' : 'transparent' }}>
                      <span className="sg-tnum" style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 700, fontSize: 15, color: c.you ? (r.ai ? 'var(--sg-violet-700)' : 'var(--sg-blue-700)') : color }}>{r.fmt(v)}</span>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </Card>
    );
  }

  // AI share-of-voice donut
  const SOV = [
    { name: 'housesigma.com', v: 31, color: '#F59E0B' },
    { name: 'the4sale.com', v: 23, color: 'var(--sg-violet-600)', you: true },
    { name: 'realtor.ca', v: 19, color: '#0A6ED1' },
    { name: 'zolo.ca', v: 14, color: '#16A34A' },
    { name: 'Others', v: 13, color: 'var(--sg-border-2)' },
  ];
  function Donut() {
    const total = SOV.reduce((a, s) => a + s.v, 0);
    const R = 64, C = 2 * Math.PI * R;
    let acc = 0;
    return (
      <Card>
        <CardHead ai title="AI share of voice" sub="Who AI engines cite for property questions" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, padding: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: 160, height: 160, flex: 'none' }}>
            <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
              {SOV.map((s) => {
                const len = (s.v / total) * C;
                const seg = <circle key={s.name} cx="80" cy="80" r={R} fill="none" stroke={s.color} strokeWidth={s.you ? 22 : 18} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} />;
                acc += len;
                return seg;
              })}
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
              <span className="sg-tnum" style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 700, fontSize: 26, color: 'var(--sg-violet-700)' }}>23%</span>
              <span style={{ fontSize: 11, color: 'var(--sg-text-3)', marginTop: 4 }}>you</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {SOV.map((s) => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: s.color }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: s.you ? 700 : 500, color: s.you ? 'var(--sg-violet-700)' : 'var(--sg-text)' }}>{s.name}{s.you && ' (you)'}</span>
                <span className="sg-tnum" style={{ fontSize: 13, fontWeight: 700, color: 'var(--sg-text)' }}>{s.v}%</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  // keyword & prompt gaps
  const GAPS = [
    { q: 'where to buy distressed properties Toronto', kind: 'prompt', who: 'housesigma.com', vol: 'High intent' },
    { q: 'best real estate platform canada', kind: 'keyword', who: 'realtor.ca', vol: '2,400/mo' },
    { q: 'how to sell a house without a realtor', kind: 'prompt', who: 'zolo.ca', vol: 'High intent' },
    { q: 'condo prices mississauga 2026', kind: 'keyword', who: 'housesigma.com', vol: '4,100/mo' },
    { q: 'is now a good time to buy in the GTA', kind: 'prompt', who: 'realtor.ca', vol: 'Rising' },
  ];
  function Gaps() {
    return (
      <Card>
        <CardHead title="Keyword & prompt gaps" sub="Where competitors win and you're not present yet — your best targets"
          right={<button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--sg-text-2)', background: 'var(--sg-sunken)', border: '1px solid var(--sg-border)', borderRadius: 'var(--sg-radius-pill)', padding: '6px 12px', cursor: 'pointer' }}>All 46 gaps</button>} />
        {GAPS.map((g, i) => {
          const isPrompt = g.kind === 'prompt';
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 120px 92px', alignItems: 'center', gap: 14, padding: '13px 20px', borderBottom: i < GAPS.length - 1 ? '1px solid var(--sg-border)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span style={{ width: 26, height: 26, borderRadius: 7, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: isPrompt ? 'var(--sg-violet-100)' : 'var(--sg-blue-50)', color: isPrompt ? 'var(--sg-violet-700)' : 'var(--sg-blue-600)' }}><Icon name={isPrompt ? 'sparkles' : 'key'} size={13} /></span>
                <span style={{ fontSize: 13.5, color: 'var(--sg-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isPrompt ? `"${g.q}"` : g.q}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--sg-text-2)' }}>Won by <strong style={{ color: 'var(--sg-text)' }}>{g.who}</strong></span>
              <span className="sg-tnum" style={{ fontSize: 12.5, color: 'var(--sg-text-2)' }}>{g.vol}</span>
              <button style={{ justifySelf: 'end', display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 13px', border: 'none', borderRadius: 'var(--sg-radius-pill)', cursor: 'pointer', fontFamily: 'var(--sg-font-sans)', fontWeight: 700, fontSize: 12.5, color: '#fff', background: isPrompt ? 'var(--sg-grad-violet)' : 'var(--sg-grad-brand)' }}><Icon name="target" size={13} /> Target</button>
            </div>
          );
        })}
      </Card>
    );
  }

  function Competitors() {
    const [sel, setSel] = React.useState('all');
    return (
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PageHead eyebrow="Research" title="Competitors" icon="target" sub="How you stack up in search AND in AI answers." />

        {/* selector chips */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {COMPS.map((c) => (
            <span key={c.domain} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 38, padding: '0 16px', borderRadius: 'var(--sg-radius-pill)',
              border: c.you ? '1px solid var(--sg-blue-500)' : '1px solid var(--sg-border)', background: c.you ? 'var(--sg-blue-50)' : 'var(--sg-card)',
              fontSize: 13, fontWeight: 600, color: c.you ? 'var(--sg-blue-700)' : 'var(--sg-text)', boxShadow: 'var(--sg-shadow)' }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: c.color }} />{c.domain}{c.you && ' (you)'}
            </span>
          ))}
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 14px', borderRadius: 'var(--sg-radius-pill)', border: '1px dashed var(--sg-border-2)', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--sg-text-2)' }}><Icon name="plus" size={15} /> Add competitor</button>
        </div>

        <ComparisonTable />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20, alignItems: 'start' }}>
          <Donut />
          <Gaps />
        </div>
      </div>
    );
  }

  window.SGCompetitors = Competitors;
})();
