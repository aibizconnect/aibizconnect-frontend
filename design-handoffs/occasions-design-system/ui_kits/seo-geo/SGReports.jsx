// ABC SEO/GEO — Block 6: Reports (white-label list + client-facing viewer).
(function () {
  const { Icon } = window.SGIcons;
  const { Card, CardHead, Gauge, PageHead } = window.SGKit;

  /* ── shared pills ── */
  function TypePill({ t }) {
    const m = { SEO: { c: 'var(--sg-blue-600)', bg: 'var(--sg-blue-50)' }, GEO: { c: 'var(--sg-violet-700)', bg: 'var(--sg-violet-100)' }, Combined: { c: 'var(--sg-text)', bg: 'var(--sg-sunken)' } }[t];
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: m.c, background: m.bg, padding: '3px 10px', borderRadius: 'var(--sg-radius-pill)' }}>{t === 'GEO' && <Icon name="sparkles" size={11} />}{t}</span>;
  }
  function StatusPill({ s }) {
    const m = { Delivered: { c: 'var(--sg-text-2)', bg: 'var(--sg-sunken)' }, Opened: { c: 'var(--sg-green)', bg: 'var(--sg-green-50)' }, Scheduled: { c: 'var(--sg-amber)', bg: 'var(--sg-amber-50)' } }[s];
    return <span style={{ fontSize: 11.5, fontWeight: 700, color: m.c, background: m.bg, padding: '3px 10px', borderRadius: 'var(--sg-radius-pill)' }}>{s}</span>;
  }
  function Avatars({ names }) {
    const pal = ['#2563EB', '#7C3AED', '#16A34A', '#F59E0B'];
    return (
      <div style={{ display: 'flex' }}>
        {names.map((n, i) => <span key={i} title={n} style={{ width: 26, height: 26, borderRadius: '50%', background: pal[i % 4], border: '2px solid var(--sg-card)', marginLeft: i ? -8 : 0, color: '#fff', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{n.split(' ').map((p) => p[0]).join('').slice(0, 2)}</span>)}
      </div>
    );
  }
  function Switch({ on: initial }) {
    const [on, setOn] = React.useState(initial);
    return (
      <button onClick={() => setOn((v) => !v)} aria-label="toggle" style={{ width: 40, height: 23, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 2,
        background: on ? 'var(--sg-blue-500)' : 'var(--sg-border-2)', transition: 'background 160ms var(--sg-ease)', display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start' }}>
        <span style={{ width: 19, height: 19, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.25)', transition: 'all 160ms var(--sg-ease)' }} />
      </button>
    );
  }

  /* ── data ── */
  const MINI = [
    { label: 'Reports sent', value: '24', icon: 'send' },
    { label: 'Scheduled', value: '6', icon: 'clock' },
    { label: 'Open rate', value: '72%', icon: 'eye' },
    { label: 'Last sent', value: '2 days ago', icon: 'calendar' },
  ];
  const SCHEDULED = [
    { name: 'Monthly SEO + GEO Summary', site: 'the4sale.com', cadence: 'Monthly', next: 'Jul 1', recip: ['Al Bolourchi', 'Sara Kim'], on: true },
    { name: 'Weekly Rank Movement', site: 'gtaluxuryhomes.ca', cadence: 'Weekly', next: 'Mon', recip: ['Dev Patel'], on: true },
    { name: 'AI Visibility Check-in', site: 'the4sale.com', cadence: 'Monthly', next: 'Jul 8', recip: ['Al Bolourchi', 'Mara Lee', 'Tom Ng'], on: false },
  ];
  const RECENT = [
    { name: 'June SEO + GEO Summary', type: 'Combined', site: 'the4sale.com', date: 'Jun 20, 2026', status: 'Opened' },
    { name: 'AI Visibility Report', type: 'GEO', site: 'the4sale.com', date: 'Jun 18, 2026', status: 'Opened' },
    { name: 'Weekly Rank Movement', type: 'SEO', site: 'gtaluxuryhomes.ca', date: 'Jun 16, 2026', status: 'Delivered' },
    { name: 'Full Site Audit', type: 'SEO', site: 'the4sale.com', date: 'Jun 12, 2026', status: 'Opened' },
    { name: 'AI Visibility Report', type: 'GEO', site: 'gtaluxuryhomes.ca', date: 'Jun 10, 2026', status: 'Delivered' },
    { name: 'Local SEO Snapshot', type: 'SEO', site: 'the4sale.com', date: 'Jun 5, 2026', status: 'Opened' },
    { name: 'May SEO + GEO Summary', type: 'Combined', site: 'the4sale.com', date: 'Jun 1, 2026', status: 'Delivered' },
    { name: 'July SEO + GEO Summary', type: 'Combined', site: 'the4sale.com', date: 'Scheduled Jul 1', status: 'Scheduled' },
  ];
  const TEMPLATES = [
    { name: 'Executive Summary', icon: 'file-text', grad: 'var(--sg-grad-brand)' },
    { name: 'Full Audit', icon: 'activity', grad: 'linear-gradient(135deg,#1E50C8,#5B8DEF)' },
    { name: 'AI Visibility Report', icon: 'sparkles', grad: 'var(--sg-grad-violet)' },
    { name: 'Local SEO', icon: 'target', grad: 'linear-gradient(135deg,#0D1B5E,#1E50C8)' },
  ];

  function MiniStat({ s }) {
    return (
      <Card style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--sg-blue-50)', color: 'var(--sg-blue-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name={s.icon} size={18} /></span>
        <div>
          <div className="sg-tnum" style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 700, fontSize: 21, color: 'var(--sg-text)', lineHeight: 1 }}>{s.value}</div>
          <div style={{ fontSize: 12, color: 'var(--sg-text-2)', marginTop: 4 }}>{s.label}</div>
        </div>
      </Card>
    );
  }

  function ActionLink({ icon, label, onClick }) {
    const [h, setH] = React.useState(false);
    return (
      <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} title={label}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px', border: '1px solid var(--sg-border)', borderRadius: 'var(--sg-radius-pill)',
          background: h ? 'var(--sg-sunken)' : 'var(--sg-card)', cursor: 'pointer', fontFamily: 'var(--sg-font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--sg-text-2)' }}>
        <Icon name={icon} size={13} /> {label}
      </button>
    );
  }

  /* ── viewer ── */
  function Section({ title, ai, children }) {
    return (
      <div style={{ borderTop: '1px solid var(--sg-border)', padding: '26px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          {ai && <Icon name="sparkles" size={17} color="var(--sg-violet-600)" />}
          <h3 style={{ margin: 0, fontFamily: 'var(--sg-font-display)', fontWeight: 600, fontSize: 19, color: 'var(--sg-text)' }}>{title}</h3>
        </div>
        {children}
      </div>
    );
  }
  function MiniMetric({ label, value, delta, dir }) {
    return (
      <div style={{ border: '1px solid var(--sg-border)', borderRadius: 'var(--sg-radius-md)', padding: '14px 16px' }}>
        <div style={{ fontSize: 12, color: 'var(--sg-text-2)', marginBottom: 8 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="sg-tnum" style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 700, fontSize: 24, color: 'var(--sg-text)' }}>{value}</span>
          {delta && <span className="sg-tnum" style={{ fontSize: 12.5, fontWeight: 700, color: dir === 'down' ? 'var(--sg-red)' : 'var(--sg-green)' }}>{dir === 'down' ? '▼' : '▲'} {delta}</span>}
        </div>
      </div>
    );
  }

  function ReportViewer({ onClose }) {
    const tools = [
      { icon: 'download', label: 'Download PDF', primary: true },
      { icon: 'send', label: 'Send to client' },
      { icon: 'clock', label: 'Schedule' },
      { icon: 'edit', label: 'Edit branding' },
    ];
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,14,40,0.55)', backdropFilter: 'blur(3px)', zIndex: 60, display: 'flex', flexDirection: 'column', animation: 'sg-fade 0.2s var(--sg-ease)' }}>
        {/* toolbar */}
        <div style={{ height: 60, flex: 'none', background: 'var(--sg-card)', borderBottom: '1px solid var(--sg-border)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px' }}>
          <button onClick={onClose} aria-label="Close" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid var(--sg-border)', borderRadius: 'var(--sg-radius-pill)', background: 'var(--sg-card)', cursor: 'pointer', height: 36, padding: '0 12px', fontSize: 13, fontWeight: 600, color: 'var(--sg-text-2)' }}><Icon name="x" size={16} /> Close</button>
          <span style={{ fontSize: 13, color: 'var(--sg-text-3)' }}>Report preview · client-facing</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 9 }}>
            {tools.map((t) => (
              <button key={t.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 36, padding: '0 14px', borderRadius: 'var(--sg-radius-pill)', cursor: 'pointer',
                border: t.primary ? 'none' : '1px solid var(--sg-border)', fontFamily: 'var(--sg-font-sans)', fontWeight: 700, fontSize: 13,
                color: t.primary ? '#fff' : 'var(--sg-text)', background: t.primary ? 'var(--sg-grad-brand)' : 'var(--sg-card)', boxShadow: t.primary ? '0 3px 10px rgba(37,99,235,0.26)' : 'none' }}>
                <Icon name={t.icon} size={15} /> {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* paper */}
        <div style={{ flex: 1, overflow: 'auto', padding: '28px 20px 60px' }}>
          <div style={{ maxWidth: 820, margin: '0 auto', background: 'var(--sg-card)', borderRadius: 'var(--sg-radius-lg)', boxShadow: 'var(--sg-shadow-lg)', overflow: 'hidden' }}>
            {/* cover */}
            <div style={{ background: 'var(--sg-grad-navy)', color: '#fff', padding: '34px 40px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -50, right: -30, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.4), transparent 70%)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
                <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--sg-grad-brand)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="play" size={14} color="#fff" /></span>
                <span style={{ fontFamily: 'var(--sg-font-logo)', fontWeight: 600, fontSize: 16 }}>AI Biz Connect</span>
              </div>
              <h1 style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 700, fontSize: 30, letterSpacing: '-0.02em', margin: '26px 0 10px', position: 'relative' }}>SEO + GEO Performance Report</h1>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13.5, color: 'rgba(226,232,240,0.82)', position: 'relative' }}>
                <span><strong style={{ color: '#fff' }}>Client:</strong> the4sale.com</span>
                <span><strong style={{ color: '#fff' }}>Period:</strong> Jun 1 – Jun 30, 2026</span>
                <span><strong style={{ color: '#fff' }}>Prepared by:</strong> Al Bolourchi, AI Biz Connect</span>
              </div>
            </div>

            <div style={{ padding: '8px 40px 36px' }}>
              {/* exec summary */}
              <Section title="Executive summary">
                <div style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 22 }}>
                    <div style={{ textAlign: 'center' }}><Gauge value={78} color="var(--sg-blue-500)" size={120} suffix="/100" big={30} /><div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sg-text-2)', marginTop: 8 }}>SEO Health</div></div>
                    <div style={{ textAlign: 'center' }}><Gauge value={64} color="var(--sg-violet-600)" size={120} suffix="/100" big={30} /><div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sg-text-2)', marginTop: 8 }}>AI Visibility</div></div>
                  </div>
                  <p style={{ flex: 1, minWidth: 280, fontSize: 14, color: 'var(--sg-text)', lineHeight: 1.65, margin: 0 }}>
                    A strong month. Your SEO health climbed <strong>+4 points</strong> and AI visibility jumped <strong>+9</strong> as more answer engines began citing the4sale.com. Organic traffic is up 3% and you now appear in <strong>37 AI answers</strong> for high-intent property searches across the GTA. The biggest opportunity remains foreclosure-related prompts, where competitors still lead.
                  </p>
                </div>
              </Section>

              {/* traffic & rankings */}
              <Section title="Traffic & rankings snapshot">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                  <MiniMetric label="Organic traffic" value="8,430" delta="3%" dir="up" />
                  <MiniMetric label="Organic keywords" value="1,284" delta="6%" dir="up" />
                  <MiniMetric label="Top-3 rankings" value="28" delta="5" dir="up" />
                  <MiniMetric label="Avg. position" value="14.2" delta="1.3" dir="up" />
                </div>
              </Section>

              {/* site health */}
              <Section title="Site health">
                <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Gauge value={82} color="var(--sg-blue-500)" size={108} suffix="%" big={26} />
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {[['12', 'Errors', 'var(--sg-red)'], ['47', 'Warnings', 'var(--sg-amber)'], ['88', 'Notices', 'var(--sg-text-2)'], ['1,204', 'Passed', 'var(--sg-green)']].map(([v, l, c]) => (
                      <div key={l} style={{ border: '1px solid var(--sg-border)', borderRadius: 'var(--sg-radius-md)', padding: '12px 18px', minWidth: 96 }}>
                        <div className="sg-tnum" style={{ fontFamily: 'var(--sg-font-display)', fontWeight: 700, fontSize: 22, color: c }}>{v}</div>
                        <div style={{ fontSize: 12, color: 'var(--sg-text-2)', marginTop: 2 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>

              {/* AI visibility */}
              <Section title="AI Visibility" ai>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 18 }}>
                  {[['ChatGPT', 71, '#10A37F'], ['Perplexity', 58, '#20808D'], ['Google AI Overviews', 49, '#4285F4'], ['Gemini', 44, '#8E75F0'], ['Copilot', 38, '#0A6ED1']].map(([n, p, c]) => (
                    <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 130, fontSize: 13, color: 'var(--sg-text)' }}>{n}</span>
                      <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--sg-violet-50)' }}><div style={{ width: p + '%', height: '100%', borderRadius: 999, background: 'var(--sg-grad-violet)' }} /></div>
                      <span className="sg-tnum" style={{ width: 38, textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--sg-violet-700)' }}>{p}%</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sg-text-2)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '6px 0 8px' }}>Sample prompt citations</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[['"best real estate deals in the GTA"', '#2', 'ChatGPT, Perplexity, Gemini'], ['"the4sale.com reviews — is it legit?"', '#1', 'ChatGPT, Copilot, Gemini']].map(([q, pos, eng]) => (
                    <div key={q} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--sg-violet-50)', borderRadius: 'var(--sg-radius-md)', padding: '11px 14px' }}>
                      <Icon name="message-square" size={15} color="var(--sg-violet-600)" />
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--sg-text)' }}>{q}</span>
                      <span style={{ fontSize: 12, color: 'var(--sg-text-2)' }}>{eng}</span>
                      <span className="sg-tnum" style={{ fontSize: 13, fontWeight: 700, color: 'var(--sg-violet-700)' }}>{pos}</span>
                    </div>
                  ))}
                </div>
              </Section>

              {/* top wins */}
              <Section title="Top wins this month">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {['Entered the top 3 for "real estate deals toronto" (was #5).', 'First citations in Google AI Overviews — up 21% in mention share.', 'Cleared 9 crawl errors; site health rose to 82%.'].map((w) => (
                    <div key={w} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: 'var(--sg-text)' }}>
                      <Icon name="check" size={18} color="var(--sg-green)" strokeWidth={2.6} style={{ flex: 'none', marginTop: 1 }} />{w}
                    </div>
                  ))}
                </div>
              </Section>

              {/* next */}
              <Section title="What we're working on next">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[['Add an FAQ about foreclosure listings', 'HIGH · GEO'], ['Speed up the top landing page (LCP 3.8s)', 'HIGH · SEO'], ['Publish a "best platforms" comparison page', 'MED · GEO']].map(([t, tag], i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--sg-border)', borderRadius: 'var(--sg-radius-md)', padding: '12px 16px' }}>
                      <span style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--sg-violet-100)', color: 'var(--sg-violet-700)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, fontFamily: 'var(--sg-font-display)' }}>{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 14, color: 'var(--sg-text)' }}>{t}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: tag.includes('GEO') ? 'var(--sg-violet-700)' : 'var(--sg-blue-600)', background: tag.includes('GEO') ? 'var(--sg-violet-100)' : 'var(--sg-blue-50)', padding: '4px 9px', borderRadius: 'var(--sg-radius-pill)' }}>{tag}</span>
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            {/* footer */}
            <div style={{ borderTop: '1px solid var(--sg-border)', background: 'var(--sg-sunken)', padding: '18px 40px', textAlign: 'center', fontSize: 12.5, color: 'var(--sg-text-2)' }}>
              Prepared by <strong style={{ color: 'var(--sg-text)' }}>AI Biz Connect</strong> · www.AIBizConnect.ca · +1 (416) 727-7111
            </div>
          </div>
        </div>
      </div>
    );
  }

  function Reports() {
    const [viewing, setViewing] = React.useState(false);
    return (
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PageHead eyebrow="Deliver" title="Reports" sub="White-label SEO + GEO reports for your clients."
          right={<button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, padding: '0 18px', border: 'none', borderRadius: 'var(--sg-radius-pill)', cursor: 'pointer', fontFamily: 'var(--sg-font-sans)', fontWeight: 700, fontSize: 14, color: '#fff', background: 'var(--sg-grad-brand)', boxShadow: '0 3px 10px rgba(37,99,235,0.26)' }}><Icon name="plus" size={16} /> New report</button>} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>{MINI.map((s) => <MiniStat key={s.label} s={s} />)}</div>

        {/* scheduled */}
        <Card>
          <CardHead title="Scheduled reports" sub="Automated delivery — toggle any off to pause" icon="clock" />
          {SCHEDULED.map((r, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 110px 120px 90px 50px', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < SCHEDULED.length - 1 ? '1px solid var(--sg-border)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--sg-blue-50)', color: 'var(--sg-blue-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name="file-text" size={16} /></span>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--sg-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
              </div>
              <span style={{ fontSize: 13, color: 'var(--sg-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.site}</span>
              <span style={{ justifySelf: 'start', fontSize: 11.5, fontWeight: 700, color: 'var(--sg-text-2)', background: 'var(--sg-sunken)', border: '1px solid var(--sg-border)', padding: '3px 11px', borderRadius: 'var(--sg-radius-pill)' }}>{r.cadence}</span>
              <span className="sg-tnum" style={{ fontSize: 13, color: 'var(--sg-text-2)' }}>Next {r.next}</span>
              <Avatars names={r.recip} />
              <div style={{ justifySelf: 'end' }}><Switch on={r.on} /></div>
            </div>
          ))}
        </Card>

        {/* recent */}
        <Card>
          <CardHead title="Recent reports" sub="Sent and scheduled across all clients" />
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 110px 1fr 130px 110px 250px', gap: 14, padding: '10px 20px', borderBottom: '1px solid var(--sg-border)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sg-text-3)' }}>
            <span>Report</span><span>Type</span><span>Site</span><span>Date sent</span><span>Status</span><span>Actions</span>
          </div>
          {RECENT.map((r, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 110px 1fr 130px 110px 250px', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: i < RECENT.length - 1 ? '1px solid var(--sg-border)' : 'none' }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--sg-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
              <span><TypePill t={r.type} /></span>
              <span style={{ fontSize: 13, color: 'var(--sg-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.site}</span>
              <span className="sg-tnum" style={{ fontSize: 12.5, color: 'var(--sg-text-2)' }}>{r.date}</span>
              <span><StatusPill s={r.status} /></span>
              <div style={{ display: 'flex', gap: 7 }}>
                <ActionLink icon="eye" label="View" onClick={() => setViewing(true)} />
                <ActionLink icon="download" label="PDF" />
                <ActionLink icon="refresh-cw" label="Resend" />
              </div>
            </div>
          ))}
        </Card>

        {/* templates */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sg-text)', marginBottom: 12 }}>Report templates</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            {TEMPLATES.map((t) => (
              <Card key={t.name} style={{ overflow: 'hidden' }}>
                <div style={{ height: 84, background: t.grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={t.icon} size={30} color="#fff" /></div>
                <div style={{ padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--sg-text)' }}>{t.name}</span>
                  <button onClick={() => setViewing(true)} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sg-blue-600)', background: 'var(--sg-blue-50)', border: 'none', borderRadius: 'var(--sg-radius-pill)', padding: '5px 14px', cursor: 'pointer' }}>Use</button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {viewing && <ReportViewer onClose={() => setViewing(false)} />}
      </div>
    );
  }

  window.SGReports = Reports;
})();
