// Pipeline screen — kanban board of deals across stages.
const { Icon } = window.ABCIcons;
const { Badge, Avatar, Button } = window.AIBizConnectDesignSystem_d948fa;

const COLUMNS = [
  { id: 'new', name: 'New', accent: 'var(--blue-300)', deals: [
    { org: 'Whitfield Law', value: '$5,000', owner: 'Dana', days: 2 },
    { org: 'Northwind LLC', value: '$3,200', owner: 'Sam', days: 1 },
    { org: 'Cedar Realty', value: '$6,800', owner: 'Dana', days: 4 },
  ] },
  { id: 'qualified', name: 'Qualified', accent: 'var(--blue-400)', deals: [
    { org: 'Lee & Co. Realty', value: '$8,400', owner: 'Dana', days: 3 },
    { org: 'Sunrise Dental', value: '$9,800', owner: 'Sam', days: 6 },
  ] },
  { id: 'proposal', name: 'Proposal', accent: 'var(--blue-500)', deals: [
    { org: 'Acme Insurance', value: '$22,000', owner: 'Dana', days: 5, hot: true },
  ] },
  { id: 'negotiation', name: 'Negotiation', accent: 'var(--blue-600)', deals: [
    { org: 'Brooks Financial', value: '$31,000', owner: 'Dana', days: 8, hot: true },
  ] },
  { id: 'won', name: 'Won', accent: 'var(--green-500)', deals: [
    { org: 'Nair Advisory', value: '$14,200', owner: 'Sam', days: 0 },
  ] },
];

function DealCard({ d }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 13, boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-xs)', cursor: 'grab', transform: hover ? 'translateY(-1px)' : 'none', transition: 'box-shadow var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-strong)' }}>{d.org}</div>
        {d.hot && <Badge tone="warning" dot>Hot</Badge>}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600, color: 'var(--color-primary)', margin: '8px 0 10px' }}>{d.value}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-muted)' }}>
          <Avatar name={d.owner} size="xs" /> {d.owner}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: d.days > 5 ? 'var(--amber-600)' : 'var(--text-muted)' }}>
          <Icon name="clock" size={13} /> {d.days === 0 ? 'today' : `${d.days}d`}
        </div>
      </div>
    </div>
  );
}

function Pipeline() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>8 active deals · <b style={{ color: 'var(--text-strong)' }}>$294k</b> weighted pipeline</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="md" leftIcon={<Icon name="filter" size={16} />}>Filter</Button>
          <Button variant="primary" size="md" leftIcon={<Icon name="plus" size={16} />}>New deal</Button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, alignItems: 'start', flex: 1, overflow: 'auto' }}>
        {COLUMNS.map((col) => (
          <div key={col.id} style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 4px 2px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.accent }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)' }}>{col.name}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginLeft: 'auto' }}>{col.deals.length}</span>
            </div>
            {col.deals.map((d, i) => <DealCard key={i} d={d} />)}
            <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36, border: '1.5px dashed var(--border-default)', borderRadius: 'var(--radius-md)', background: 'transparent', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Icon name="plus" size={15} /> Add
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

window.ABCPipeline = Pipeline;
