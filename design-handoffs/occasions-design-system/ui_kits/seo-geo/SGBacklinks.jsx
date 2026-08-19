// ABC SEO/GEO — Block 9: Backlinks (populated).
(function () {
  const { Icon } = window.SGIcons;
  const { Card, CardHead, Delta, PageHead } = window.SGKit;

  const STATS = [
    { label: 'Total backlinks', value: '412', delta: '12', dir: 'up' },
    { label: 'Referring domains', value: '148', delta: '5', dir: 'up' },
    { label: 'Authority score', value: '32', sub: '/100' },
    { label: 'Toxic links', value: '7', warn: true },
    { label: 'New / Lost (30d)', value: '24 / 9', split: true },
  ];
  function StatRow() {
    return (
      <Card style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', overflow: 'hidden' }}>
        {STATS.map((s, i) => (
          <div key={s.label} style={{ padding: '18px 20px', borderLeft: i ? '1px solid var(--sg-border)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--sg-text-2)', marginBottom: 8 }}>{s.warn && <Icon name="alert-triangle" size={13} color="var(--sg-amber)" />}{s.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              {s.split
                ? <span className="sg-tnum" style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 700, fontSize: 24, lineHeight: 1 }}><span style={{ color: 'var(--sg-green)' }}>24</span><span style={{ color: 'var(--sg-text-3)' }}> / </span><span style={{ color: 'var(--sg-red)' }}>9</span></span>
                : <span className="sg-tnum" style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em', color: s.warn ? 'var(--sg-amber)' : 'var(--sg-text)', lineHeight: 1 }}>{s.value}{s.sub && <span style={{ fontSize: 15, color: 'var(--sg-text-3)' }}>{s.sub}</span>}</span>}
              {s.delta && <Delta dir={s.dir}>{s.delta}</Delta>}
            </div>
          </div>
        ))}
      </Card>
    );
  }

  /* new vs lost trend */
  function NewLostTrend() {
    const newD = [14, 9, 12, 18, 11, 16, 21, 17, 22, 19, 24];
    const lostD = [6, 8, 5, 7, 9, 6, 4, 8, 7, 5, 9];
    const W = 360, H = 170, padX = 14, padT = 14, padB = 22;
    const max = 26;
    const x = (i) => padX + (i * (W - padX * 2)) / (newD.length - 1);
    const y = (v) => padT + (1 - v / max) * (H - padT - padB);
    const path = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    return (
      <Card>
        <CardHead title="New vs lost links" sub="Last 11 weeks"
          right={(
            <div style={{ display: 'flex', gap: 14 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--sg-text-2)' }}><span style={{ width: 12, height: 3, borderRadius: 2, background: 'var(--sg-green)' }} /> New</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--sg-text-2)' }}><span style={{ width: 12, height: 3, borderRadius: 2, background: 'var(--sg-red)' }} /> Lost</span>
            </div>
          )} />
        <div style={{ padding: '14px 16px 8px' }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="170" preserveAspectRatio="none" style={{ display: 'block' }}>
            {[0, 1, 2].map((g) => <line key={g} x1={padX} x2={W - padX} y1={padT + g * (H - padT - padB) / 2} y2={padT + g * (H - padT - padB) / 2} stroke="var(--sg-border)" strokeWidth="1" strokeDasharray="3 4" />)}
            <path d={path(newD)} fill="none" stroke="var(--sg-green)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            <path d={path(lostD)} fill="none" stroke="var(--sg-red)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={x(newD.length - 1)} cy={y(newD[newD.length - 1])} r="4.5" fill="var(--sg-green)" stroke="#fff" strokeWidth="2.5" />
            <circle cx={x(lostD.length - 1)} cy={y(lostD[lostD.length - 1])} r="4.5" fill="var(--sg-red)" stroke="#fff" strokeWidth="2.5" />
          </svg>
        </div>
      </Card>
    );
  }

  function ToxicCallout() {
    return (
      <Card style={{ padding: 22, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--sg-amber-50)', color: 'var(--sg-amber)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name="alert-triangle" size={22} /></span>
          <div>
            <div className="sg-tnum" style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 700, fontSize: 22, color: 'var(--sg-text)', lineHeight: 1 }}>7 toxic links</div>
            <div style={{ fontSize: 12.5, color: 'var(--sg-text-2)', marginTop: 4 }}>from 5 low-quality domains</div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--sg-text-2)', lineHeight: 1.55, margin: '0 0 16px' }}>
          These links may hurt your rankings. Review and disavow them so Google ignores them — we'll prepare the file for you.
        </p>
        <button style={{ marginTop: 'auto', width: '100%', height: 42, border: 'none', borderRadius: 'var(--sg-radius-pill)', cursor: 'pointer', fontFamily: 'var(--sg-font-sans)', fontWeight: 700, fontSize: 14, color: '#fff', background: 'var(--sg-amber)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon name="alert-triangle" size={16} /> Review & disavow
        </button>
      </Card>
    );
  }

  function Auth({ v }) {
    const c = v >= 60 ? 'var(--sg-green)' : v >= 30 ? 'var(--sg-amber)' : 'var(--sg-red)';
    const bg = v >= 60 ? 'var(--sg-green-50)' : v >= 30 ? 'var(--sg-amber-50)' : 'var(--sg-red-50)';
    return <span className="sg-tnum" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 34, height: 24, padding: '0 8px', fontSize: 12.5, fontWeight: 700, color: c, background: bg, borderRadius: 'var(--sg-radius-sm)' }}>{v}</span>;
  }
  function TypePill({ t }) {
    const dofollow = t === 'Dofollow';
    return <span style={{ fontSize: 11.5, fontWeight: 700, color: dofollow ? 'var(--sg-blue-600)' : 'var(--sg-text-2)', background: dofollow ? 'var(--sg-blue-50)' : 'var(--sg-sunken)', padding: '3px 10px', borderRadius: 'var(--sg-radius-pill)' }}>{t}</span>;
  }
  function StatusPill({ s }) {
    const m = { New: { c: 'var(--sg-green)', bg: 'var(--sg-green-50)' }, Lost: { c: 'var(--sg-red)', bg: 'var(--sg-red-50)' }, Active: { c: 'var(--sg-text-2)', bg: 'var(--sg-sunken)' } }[s];
    return <span style={{ fontSize: 11.5, fontWeight: 700, color: m.c, background: m.bg, padding: '3px 10px', borderRadius: 'var(--sg-radius-pill)' }}>{s}</span>;
  }

  const DOMAINS = [
    { domain: 'blogto.com', auth: 78, links: 12, seen: 'Jun 2026', type: 'Dofollow', status: 'New' },
    { domain: 'thestar.com', auth: 86, links: 4, seen: 'May 2026', type: 'Dofollow', status: 'Active' },
    { domain: 'narcity.com', auth: 64, links: 7, seen: 'Jun 2026', type: 'Dofollow', status: 'New' },
    { domain: 'realestatemagazine.ca', auth: 52, links: 9, seen: 'Apr 2026', type: 'Dofollow', status: 'Active' },
    { domain: 'storeys.com', auth: 49, links: 5, seen: 'Jun 2026', type: 'Nofollow', status: 'New' },
    { domain: 'movesmartly.com', auth: 41, links: 6, seen: 'Mar 2026', type: 'Dofollow', status: 'Active' },
    { domain: 'gtahomehub.info', auth: 18, links: 3, seen: 'May 2026', type: 'Dofollow', status: 'Lost' },
    { domain: 'cheap-seo-links.biz', auth: 6, links: 14, seen: 'Feb 2026', type: 'Dofollow', status: 'Active', toxic: true },
    { domain: 'directory-spam.net', auth: 9, links: 8, seen: 'Jan 2026', type: 'Nofollow', status: 'Active', toxic: true },
    { domain: 'torontolife.com', auth: 81, links: 2, seen: 'Jun 2026', type: 'Dofollow', status: 'New' },
  ];
  function DomainRow({ r, last }) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 70px 110px 110px 90px', alignItems: 'center', gap: 14, padding: '13px 20px', borderBottom: last ? 'none' : '1px solid var(--sg-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--sg-sunken)', color: 'var(--sg-text-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name="globe" size={14} /></span>
          <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--sg-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.domain}</span>
          {r.toxic && <span title="Toxic" style={{ flex: 'none', color: 'var(--sg-amber)', display: 'inline-flex' }}><Icon name="alert-triangle" size={14} /></span>}
        </div>
        <Auth v={r.auth} />
        <span className="sg-tnum" style={{ fontSize: 13, color: 'var(--sg-text-2)' }}>{r.links}</span>
        <span className="sg-tnum" style={{ fontSize: 12.5, color: 'var(--sg-text-2)' }}>{r.seen}</span>
        <span><TypePill t={r.type} /></span>
        <span style={{ justifySelf: 'start' }}><StatusPill s={r.status} /></span>
      </div>
    );
  }

  function Backlinks() {
    return (
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PageHead eyebrow="Research" title="Backlinks" icon="link" sub="Links pointing to the4sale.com." />
        <StatRow />
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, alignItems: 'stretch' }}>
          <NewLostTrend />
          <ToxicCallout />
        </div>
        <Card>
          <CardHead title="Referring domains" sub="148 domains linking to you"
            right={<button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--sg-text-2)', background: 'var(--sg-sunken)', border: '1px solid var(--sg-border)', borderRadius: 'var(--sg-radius-pill)', padding: '6px 12px', cursor: 'pointer' }}><Icon name="download" size={13} /> Export</button>} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 70px 110px 110px 90px', gap: 14, padding: '10px 20px', borderBottom: '1px solid var(--sg-border)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sg-text-3)' }}>
            <span>Domain</span><span>Authority</span><span>Links</span><span>First seen</span><span>Type</span><span>Status</span>
          </div>
          {DOMAINS.map((r, i) => <DomainRow key={i} r={r} last={i === DOMAINS.length - 1} />)}
        </Card>
      </div>
    );
  }

  window.SGBacklinks = Backlinks;
})();
