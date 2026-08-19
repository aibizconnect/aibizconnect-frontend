// ABC SEO/GEO — Block 3: Site Audit. Health gauge, Core Web Vitals, issues table.
(function () {
  const { Icon } = window.SGIcons;
  const { Card, CardHead, Gauge, PageHead, ActionBtn } = window.SGKit;

  /* health hero + counts */
  const COUNTS = [
    { label: 'Errors', value: 12, color: 'var(--sg-red)', bg: 'var(--sg-red-50)', icon: 'x' },
    { label: 'Warnings', value: 47, color: 'var(--sg-amber)', bg: 'var(--sg-amber-50)', icon: 'info' },
    { label: 'Notices', value: 88, color: 'var(--sg-text-2)', bg: 'var(--sg-sunken)', icon: 'eye' },
    { label: 'Passed', value: '1,204', color: 'var(--sg-green)', bg: 'var(--sg-green-50)', icon: 'check' },
  ];
  function HealthHero() {
    return (
      <Card style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap', animation: 'sg-rise 0.4s var(--sg-ease) both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: '1 1 300px' }}>
          <Gauge value={82} color="var(--sg-blue-500)" size={148} suffix="%" />
          <div>
            <div style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 600, fontSize: 18, color: 'var(--sg-text)' }}>Site Health</div>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--sg-text-2)', maxWidth: 230, lineHeight: 1.5 }}>Healthy overall. Clearing the 12 errors first will give you the biggest lift.</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: '1 1 320px' }}>
          {COUNTS.map((c) => (
            <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: '1px solid var(--sg-border)', borderRadius: 'var(--sg-radius-md)' }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, background: c.bg, color: c.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name={c.icon} size={18} strokeWidth={2.4} /></span>
              <div>
                <div className="sg-tnum" style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 700, fontSize: 22, color: c.color, lineHeight: 1 }}>{c.value}</div>
                <div style={{ fontSize: 12, color: 'var(--sg-text-2)', marginTop: 3 }}>{c.label}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  /* core web vitals */
  const VITALS = {
    mobile: [
      { k: 'LCP', name: 'Largest Contentful Paint', v: '3.8s', state: 'Poor', c: 'var(--sg-red)', bg: 'var(--sg-red-50)', pct: 38 },
      { k: 'INP', name: 'Interaction to Next Paint', v: '180ms', state: 'Needs work', c: 'var(--sg-amber)', bg: 'var(--sg-amber-50)', pct: 64 },
      { k: 'CLS', name: 'Cumulative Layout Shift', v: '0.04', state: 'Good', c: 'var(--sg-green)', bg: 'var(--sg-green-50)', pct: 92 },
    ],
    desktop: [
      { k: 'LCP', name: 'Largest Contentful Paint', v: '2.1s', state: 'Good', c: 'var(--sg-green)', bg: 'var(--sg-green-50)', pct: 88 },
      { k: 'INP', name: 'Interaction to Next Paint', v: '120ms', state: 'Good', c: 'var(--sg-green)', bg: 'var(--sg-green-50)', pct: 90 },
      { k: 'CLS', name: 'Cumulative Layout Shift', v: '0.02', state: 'Good', c: 'var(--sg-green)', bg: 'var(--sg-green-50)', pct: 96 },
    ],
  };
  function CoreVitals() {
    const [dev, setDev] = React.useState('mobile');
    return (
      <Card>
        <CardHead title="Core Web Vitals" sub="Real-world page experience scores from Google"
          right={(
            <div style={{ display: 'inline-flex', background: 'var(--sg-sunken)', border: '1px solid var(--sg-border)', borderRadius: 'var(--sg-radius-pill)', padding: 3 }}>
              {['mobile', 'desktop'].map((d) => (
                <button key={d} onClick={() => setDev(d)} style={{ height: 30, padding: '0 14px', border: 'none', borderRadius: 'var(--sg-radius-pill)', cursor: 'pointer', textTransform: 'capitalize',
                  fontFamily: 'var(--sg-font-sans)', fontWeight: 600, fontSize: 12.5, background: dev === d ? 'var(--sg-card)' : 'transparent', color: dev === d ? 'var(--sg-text)' : 'var(--sg-text-2)', boxShadow: dev === d ? 'var(--sg-shadow)' : 'none' }}>{d}</button>
              ))}
            </div>
          )} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, padding: 20 }}>
          {VITALS[dev].map((m) => (
            <div key={m.k} style={{ border: '1px solid var(--sg-border)', borderRadius: 'var(--sg-radius-md)', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 700, fontSize: 13, color: 'var(--sg-text-2)', letterSpacing: '0.02em' }}>{m.k}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: m.c, background: m.bg, padding: '3px 9px', borderRadius: 'var(--sg-radius-pill)' }}>{m.state}</span>
              </div>
              <div className="sg-tnum" style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 700, fontSize: 30, letterSpacing: '-0.02em', color: 'var(--sg-text)', margin: '10px 0 4px' }}>{m.v}</div>
              <div style={{ fontSize: 11.5, color: 'var(--sg-text-3)', marginBottom: 12 }}>{m.name}</div>
              <div style={{ height: 6, borderRadius: 999, background: 'var(--sg-sunken)', overflow: 'hidden' }}>
                <div style={{ width: m.pct + '%', height: '100%', borderRadius: 999, background: m.c, transformOrigin: 'left', animation: 'sg-grow 0.7s var(--sg-ease) both' }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  /* issues table */
  const ISSUES = [
    { sev: 'Error', c: 'var(--sg-red)', bg: 'var(--sg-red-50)', items: [
      { t: '12 pages have no meta description', pages: 12, trend: 'new', n: 3 },
      { t: 'LCP element is render-blocked on 6 pages', pages: 6, trend: 'new', n: 6 },
    ] },
    { sev: 'Warning', c: 'var(--sg-amber)', bg: 'var(--sg-amber-50)', items: [
      { t: '8 images are missing alt text', pages: 8, trend: 'fixed', n: 4 },
      { t: '14 pages have thin content (under 300 words)', pages: 14, trend: 'new', n: 2 },
      { t: '5 internal links point to redirects', pages: 5, trend: 'fixed', n: 5 },
    ] },
    { sev: 'Notice', c: 'var(--sg-text-2)', bg: 'var(--sg-sunken)', items: [
      { t: '21 pages could use more descriptive titles', pages: 21, trend: 'new', n: 1 },
    ] },
  ];
  function IssueRow({ it, c, last }) {
    const [open, setOpen] = React.useState(false);
    return (
      <div style={{ borderBottom: last ? 'none' : '1px solid var(--sg-border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px 120px', alignItems: 'center', gap: 14, padding: '13px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, flex: 'none' }} />
            <span style={{ fontSize: 13.5, color: 'var(--sg-text)' }}>{it.t}</span>
          </div>
          <span className="sg-tnum" style={{ fontSize: 13, color: 'var(--sg-text-2)' }}>{it.pages} pages</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: it.trend === 'fixed' ? 'var(--sg-green)' : 'var(--sg-violet-700)' }}>
            <Icon name={it.trend === 'fixed' ? 'check' : 'plus'} size={13} strokeWidth={2.6} /> {it.n} {it.trend}
          </span>
          <button onClick={() => setOpen((o) => !o)} style={{ justifySelf: 'start', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: 'var(--sg-blue-600)', background: 'none', border: 'none', cursor: 'pointer' }}>
            How to fix <Icon name={open ? 'chevron-up' : 'chevron-down'} size={14} />
          </button>
        </div>
        {open && (
          <div style={{ padding: '0 20px 16px 37px', animation: 'sg-fade 0.2s var(--sg-ease)' }}>
            <div style={{ display: 'flex', gap: 10, fontSize: 12.5, color: 'var(--sg-text-2)', lineHeight: 1.55, background: 'var(--sg-sunken)', border: '1px solid var(--sg-border)', borderRadius: 'var(--sg-radius-md)', padding: '12px 14px' }}>
              <Icon name="help-circle" size={16} color="var(--sg-blue-600)" style={{ flex: 'none', marginTop: 1 }} />
              <span>Add a unique 140–160 character summary to each affected page. We can auto-draft them for you, then you approve before publishing.</span>
            </div>
          </div>
        )}
      </div>
    );
  }
  function IssuesTable() {
    return (
      <Card>
        <CardHead title="Issues" sub="Grouped by severity — start at the top"
          right={<button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--sg-text-2)', background: 'var(--sg-sunken)', border: '1px solid var(--sg-border)', borderRadius: 'var(--sg-radius-pill)', padding: '6px 12px', cursor: 'pointer' }}><Icon name="download" size={13} /> Export</button>} />
        {ISSUES.map((g) => (
          <div key={g.sev}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 20px', background: 'var(--sg-sunken)', borderBottom: '1px solid var(--sg-border)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: g.c, background: g.bg, padding: '3px 10px', borderRadius: 'var(--sg-radius-pill)' }}>{g.sev}</span>
              <span className="sg-tnum" style={{ fontSize: 12, color: 'var(--sg-text-3)' }}>{g.items.length} {g.items.length === 1 ? 'issue' : 'issues'}</span>
            </div>
            {g.items.map((it, i) => <IssueRow key={i} it={it} c={g.c} last={i === g.items.length - 1} />)}
          </div>
        ))}
      </Card>
    );
  }

  function SiteAudit() {
    return (
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PageHead eyebrow="Research" title="Site Audit" icon="activity" sub="Last crawled 2 hours ago · 248 pages scanned."
          right={(
            <React.Fragment>
              <button style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 42, padding: '0 16px', border: '1px solid var(--sg-border)', borderRadius: 'var(--sg-radius-pill)', background: 'var(--sg-card)', cursor: 'pointer', fontFamily: 'var(--sg-font-sans)', fontWeight: 600, fontSize: 13.5, color: 'var(--sg-text)' }}>
                <Icon name="file-text" size={15} color="var(--sg-text-2)" /> Send report to client
              </button>
              <ActionBtn icon="refresh-cw">Re-crawl</ActionBtn>
            </React.Fragment>
          )} />
        <HealthHero />
        <CoreVitals />
        <IssuesTable />
      </div>
    );
  }

  window.SGSiteAudit = SiteAudit;
})();
