// Dashboard screen — overview KPIs, pipeline-by-stage, activity feed & tasks.
const { Icon } = window.ABCIcons;
const { Stat, Card, CardHeader, Badge, Avatar, Button } = window.AIBizConnectDesignSystem_d948fa;

const STATS = [
  { label: 'Pipeline value', value: '$48,920', delta: '12.4%', icon: 'dollar-sign' },
  { label: 'New leads', value: '327', delta: '8.1%', icon: 'users' },
  { label: 'Win rate', value: '34%', delta: '3.2%', icon: 'trending-up' },
  { label: 'Tasks due', value: '9', delta: '-2', icon: 'clock' },
];

const STAGES = [
  { name: 'New', count: 86, value: '$112k', pct: 100, color: 'var(--blue-300)' },
  { name: 'Qualified', count: 41, value: '$78k', pct: 64, color: 'var(--blue-400)' },
  { name: 'Proposal', count: 18, value: '$49k', pct: 38, color: 'var(--blue-500)' },
  { name: 'Negotiation', count: 9, value: '$31k', pct: 22, color: 'var(--blue-600)' },
  { name: 'Won', count: 14, value: '$24k', pct: 30, color: 'var(--green-500)' },
];

const ACTIVITY = [
  { who: 'Marcus Lee', what: 'booked a discovery call', when: '12m ago', tone: 'brand', icon: 'calendar' },
  { who: 'Acme Insurance', what: 'opened your proposal', when: '40m ago', tone: 'neutral', icon: 'file-text' },
  { who: 'Priya Nair', what: 'replied to "Q2 follow-up"', when: '1h ago', tone: 'success', icon: 'mail' },
  { who: 'New lead', what: 'submitted the contact form', when: '2h ago', tone: 'brand', icon: 'inbox' },
];

const TASKS = [
  { t: 'Call back J. Whitfield re: policy renewal', due: 'Today · 2:00 PM', done: false },
  { t: 'Send proposal to Acme Insurance', due: 'Today · 4:30 PM', done: false },
  { t: 'Follow up with 3 stale leads', due: 'Tomorrow', done: false },
  { t: 'Review weekly campaign report', due: 'Done', done: true },
];

function StageBar({ s }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 92, fontSize: 13, fontWeight: 600, color: 'var(--text-strong)' }}>{s.name}</div>
      <div style={{ flex: 1, height: 28, background: 'var(--gray-100)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', position: 'relative' }}>
        <div style={{ width: s.pct + '%', height: '100%', background: s.color, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--white)' }}>{s.count}</span>
        </div>
      </div>
      <div style={{ width: 56, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-body)' }}>{s.value}</div>
    </div>
  );
}

function Dashboard() {
  const [tasks, setTasks] = React.useState(TASKS);
  const toggle = (i) => setTasks((t) => t.map((x, j) => j === i ? { ...x, done: !x.done } : x));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 26, color: 'var(--text-heading)', letterSpacing: '-0.02em' }}>Good morning, Dana 👋</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>Here's what's happening across your book of business today.</div>
        </div>
        <Button variant="secondary" leftIcon={<Icon name="calendar" size={16} />}>This month</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        {STATS.map((s) => (
          <Card key={s.label} padding="md"><Stat {...s} icon={<Icon name={s.icon} size={16} />} /></Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        <Card padding="md">
          <CardHeader title="Pipeline by stage" subtitle="Weighted value · this quarter" action={<Badge tone="brand">$294k total</Badge>} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {STAGES.map((s) => <StageBar key={s.name} s={s} />)}
          </div>
        </Card>

        <Card padding="md">
          <CardHeader title="Activity" action={<a href="#" style={{ fontSize: 13, fontWeight: 600 }}>View all</a>} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {ACTIVITY.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                <span style={{ width: 32, height: 32, flex: 'none', borderRadius: 'var(--radius-md)', background: 'var(--blue-50)', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={a.icon} size={15} />
                </span>
                <div style={{ flex: 1, fontSize: 13.5, lineHeight: 1.45, color: 'var(--text-body)' }}>
                  <b style={{ color: 'var(--text-strong)' }}>{a.who}</b> {a.what}
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{a.when}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card padding="md">
        <CardHeader title="Today's tasks" subtitle={`${tasks.filter(t => !t.done).length} remaining`} action={<Button variant="ghost" size="sm" leftIcon={<Icon name="plus" size={15} />}>Add task</Button>} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {tasks.map((t, i) => (
            <div key={i} onClick={() => toggle(i)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: i ? '1px solid var(--border-subtle)' : 'none', cursor: 'pointer' }}>
              <span style={{ width: 20, height: 20, flex: 'none', borderRadius: 'var(--radius-xs)', border: `1.5px solid ${t.done ? 'var(--color-primary)' : 'var(--border-strong)'}`, background: t.done ? 'var(--color-primary)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {t.done && <Icon name="check" size={13} color="white" strokeWidth={3} />}
              </span>
              <span style={{ flex: 1, fontSize: 14, color: t.done ? 'var(--text-muted)' : 'var(--text-strong)', textDecoration: t.done ? 'line-through' : 'none' }}>{t.t}</span>
              <Badge tone={t.done ? 'success' : 'neutral'}>{t.due}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

window.ABCDashboard = Dashboard;
