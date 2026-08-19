// Contacts screen — searchable/filterable table of leads & clients.
const { Icon } = window.ABCIcons;
const { Tabs, Badge, Avatar, Button, Input } = window.AIBizConnectDesignSystem_d948fa;

const CONTACTS = [
  { name: 'Marcus Lee', org: 'Lee & Co. Realty', email: 'marcus@leeco.com', stage: 'qualified', value: '$8,400', owner: 'Dana', tag: 'Real estate' },
  { name: 'Acme Insurance', org: 'Acme Insurance Group', email: 'hello@acme-ins.com', stage: 'proposal', value: '$22,000', owner: 'Dana', tag: 'Insurance' },
  { name: 'Priya Nair', org: 'Nair Advisory', email: 'priya@nairadvisory.io', stage: 'won', value: '$14,200', owner: 'Sam', tag: 'Advisor' },
  { name: 'J. Whitfield', org: 'Whitfield Law', email: 'jw@whitfieldlaw.com', stage: 'new', value: '$5,000', owner: 'Dana', tag: 'Legal' },
  { name: 'Sunrise Dental', org: 'Sunrise Dental PC', email: 'office@sunrise.dental', stage: 'qualified', value: '$9,800', owner: 'Sam', tag: 'Healthcare' },
  { name: 'Octavia Brooks', org: 'Brooks Financial', email: 'octavia@brooksfin.com', stage: 'negotiation', value: '$31,000', owner: 'Dana', tag: 'Advisor' },
  { name: 'Northwind LLC', org: 'Northwind Holdings', email: 'team@northwind.co', stage: 'new', value: '$3,200', owner: 'Sam', tag: 'Other' },
];

const STAGE_TONE = { new: 'neutral', qualified: 'brand', proposal: 'warning', negotiation: 'warning', won: 'success' };
const STAGE_LABEL = { new: 'New', qualified: 'Qualified', proposal: 'Proposal', negotiation: 'Negotiation', won: 'Won' };

function Contacts({ onOpen }) {
  const [view, setView] = React.useState('all');
  const [q, setQ] = React.useState('');
  const rows = CONTACTS.filter((c) =>
    (view === 'all' || (view === 'clients' ? c.stage === 'won' : c.stage !== 'won')) &&
    (c.name.toLowerCase().includes(q.toLowerCase()) || c.org.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Tabs value={view} onChange={setView} tabs={[
          { value: 'all', label: 'All', count: 248 },
          { value: 'leads', label: 'Leads', count: 234 },
          { value: 'clients', label: 'Clients', count: 14 },
        ]} />
        <div style={{ marginLeft: 'auto', width: 240 }}>
          <Input placeholder="Search contacts" value={q} onChange={(e) => setQ(e.target.value)} leftIcon={<Icon name="search" size={16} />} />
        </div>
        <Button variant="secondary" leftIcon={<Icon name="filter" size={16} />}>Filter</Button>
      </div>

      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.4fr 1fr 1fr 40px', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--gray-50)', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          <div>Contact</div><div>Stage</div><div>Owner</div><div style={{ textAlign: 'right' }}>Value</div><div></div>
        </div>
        {rows.map((c, i) => <Row key={c.email} c={c} last={i === rows.length - 1} onOpen={() => onOpen?.(c)} />)}
        {rows.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>No contacts match "{q}".</div>
        )}
      </div>
    </div>
  );
}

function Row({ c, last, onOpen }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div onClick={onOpen} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.4fr 1fr 1fr 40px', gap: 12, padding: '13px 18px', alignItems: 'center', borderBottom: last ? 'none' : '1px solid var(--border-subtle)', cursor: 'pointer', background: hover ? 'var(--gray-50)' : 'transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <Avatar name={c.name} size="md" />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.org}</div>
        </div>
      </div>
      <div><Badge tone={STAGE_TONE[c.stage]} dot>{STAGE_LABEL[c.stage]}</Badge></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: 'var(--text-body)' }}>
        <Avatar name={c.owner} size="xs" /> {c.owner}
      </div>
      <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13.5, fontWeight: 500, color: 'var(--text-strong)' }}>{c.value}</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', color: 'var(--text-muted)' }}>
        <Icon name="chevron-right" size={17} />
      </div>
    </div>
  );
}

window.ABCContacts = Contacts;
