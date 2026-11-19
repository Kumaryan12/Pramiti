import { useState } from 'react'
import { Activity, ArrowDownRight, Check, FlaskConical, GitBranch, ListFilter, ShieldCheck, ShoppingBag, TriangleAlert, UserRoundCheck, X } from 'lucide-react'
import { money, type Evidence, type Mandate, type Payment, type Product } from './api'
import {
  ActionLink, Card, ChartContainer, EmptyState, instant, PageHeader, StatisticCard, StatusBadge, TextLink,
  TransactionTable,
} from './components'
export const scenarios = [
  { key: 'legitimate', title: 'Legitimate payment', icon: ShieldCheck, detail: 'The agent proposes the authorized 65W charger.', surface: 'Synthetic catalogue', purpose: 'Establish a control using the product named by the signed mandate.' },
  { key: 'over_budget', title: 'Policy violation', icon: TriangleAlert, detail: 'The agent proposes a charger above the default payment limit.', surface: 'Payment amount', purpose: 'Test how the firewall handles a proposal beyond the signed cap.' },
  { key: 'substitution', title: 'Suspicious substitution', icon: GitBranch, detail: 'A merchant claim steers the agent toward a cheaper charger.', surface: 'Merchant listing description', purpose: 'Test whether an in-budget substitution has independent evidence of compatibility.' },
] as const
export type Scenario = typeof scenarios[number]['key']

function ActivityChart({ payments, period }: { payments: Payment[]; period:number }) {
  const days = Array.from({length: period}, (_, i) => {
    const day = new Date()
    day.setDate(day.getDate() - (period - 1 - i))
    const dateKey = day.toDateString()
    const rows = payments.filter(item => item.created_at && new Date(item.created_at).toDateString() === dateKey)
    return {
      day: new Intl.DateTimeFormat('en-IN', { day:'numeric', month:'short' }).format(day),
      approve: rows.filter(item => item.decision === 'ALLOW').length,
      review: rows.filter(item => item.decision === 'ESCALATE').length,
      reject: rows.filter(item => item.decision === 'REJECT').length,
    }
  })
  const maximum = Math.max(1, ...days.map(d => d.approve + d.review + d.reject))
  if (!days.some(d => d.approve + d.review + d.reject)) return <div className="chart-placeholder"><Activity size={22} aria-hidden="true"/><p>No decisions during this period.</p></div>
  return <>
    <div className="activity-chart" style={{gridTemplateColumns:'repeat('+period+',minmax(0,1fr))'}} aria-hidden="true">{days.map(day => <div className="activity-day" key={day.day}>
      <div className="activity-track">{(['approve','review','reject'] as const).map(kind => <div key={kind} className={'plot-' + kind} style={{height: (100 * day[kind] / maximum) + '%'}}/>)}</div>
      <span>{day.day}</span>
    </div>)}</div>
    <div className="chart-legend" aria-hidden="true"><span className="plot-approve"/> Approved <span className="plot-review"/> Human review <span className="plot-reject"/> Rejected</div>
    <table className="visually-hidden"><caption>Decision counts by local calendar day</caption><thead><tr><th>Day</th><th>Approved</th><th>Human review</th><th>Rejected</th></tr></thead><tbody>
      {days.map(day => <tr key={day.day}><th>{day.day}</th><td>{day.approve}</td><td>{day.review}</td><td>{day.reject}</td></tr>)}
    </tbody></table>
  </>
}

export function Dashboard({ payments, catalogue, evidence, refreshed, busy, onRefresh }: {
  payments: Payment[]; catalogue: Product[]; evidence?: Evidence; refreshed?: string; busy: boolean; onRefresh: () => void
}) {
  const [period,setPeriod]=useState(7)
  const pending = payments.filter(item => item.status === 'PENDING')
  const settled = payments.filter(item => item.status === 'SETTLED')
  const decisions = (d: Payment['decision']) => payments.filter(item => item.decision === d).length
  const observedModel = payments.find(item => item.semantic)?.semantic
  const count = payments.length
  return <>
    <PageHeader title="Command Centre" description="Monitor agent payment decisions, review exceptions, and trace settlement evidence."
      context={<p className="eyebrow">Workspace overview</p>} actions={<><button className="btn secondary" onClick={onRefresh} disabled={busy}>Refresh</button><ActionLink href="#demo">Run Demo</ActionLink></>}/>
    <div className="data-context"><span><FlaskConical size={16} aria-hidden="true"/> Synthetic payment workspace</span><span role="status">{busy ? 'Refreshing session data' : refreshed ? 'Updated ' + instant(refreshed) : 'Awaiting session data'}</span></div>
    <div className="stats-grid command-counts">
      <StatisticCard title="Transactions" value={count} detail="All proposals in this session" icon={ListFilter}/>
      <StatisticCard title="Auto-approved" value={decisions('ALLOW')} detail={count + ' total proposals'} icon={Check} tone="success"/>
      <StatisticCard title="Escalated" value={decisions('ESCALATE')} detail={count + ' total proposals'} icon={ArrowDownRight} tone="warning"/>
      <StatisticCard title="Rejected" value={decisions('REJECT')} detail={count + ' total proposals'} icon={X} tone="danger"/>
      <StatisticCard title="Pending review" value={pending.length} detail={decisions('ESCALATE') + ' escalated proposals'} icon={UserRoundCheck} tone="warning"/>
    </div>
    <div className="command-grid">
      <ChartContainer title="Decision trends" note="Decisions by local calendar day" action={<select className="period-control" aria-label="Trend period" value={period} onChange={e=>setPeriod(Number(e.target.value))}><option value={3}>Last 3 days</option><option value={7}>Last 7 days</option></select>}>
        <ActivityChart payments={payments} period={period}/>
      </ChartContainer>
        <Card title="Needs attention" note="Outstanding human review">
          {pending.length ? <ul className="compact-list">{pending.slice(0, 3).map(item => <li key={item.id}>
            <div><strong>{item.proposal.merchant}</strong><small>{money(item.proposal.amount)} · {item.reasons[0]}</small></div><a className="text-link" href={'#review?tx=' + item.id}>Review<span className="visually-hidden">{' ' + item.id}</span></a>
          </li>)}</ul> : <div className="inline-empty"><Check size={18} aria-hidden="true"/> No proposals waiting for review.</div>}
        </Card>
        <Card title="Recent transactions" note="Latest proposals in this sandbox session" action={<TextLink href="#verification">View transactions</TextLink>} className="table-card">
          {count ? <TransactionTable rows={payments.slice(0, 5)} catalogue={catalogue} compact /> : <EmptyState title="No payment proposals yet" description="Sign a demo mandate, run the shopper, and inspect the verifier’s decision." icon={ShoppingBag} action={<ActionLink href="#demo">Start the demo</ActionLink>}/>}
        </Card>
      <div className="flow">
        <Card title="Verification and outcome">
          <dl className="detail-list">
            <div><dt>Settled in simulation</dt><dd className="amount">{settled.length} · {money(settled.reduce((sum,item) => sum + item.proposal.amount, 0))}</dd></div>
            <div><dt>Calibrated model</dt><dd>{observedModel ? 'Scored'+(observedModel.alpha!==undefined ? ' · α '+observedModel.alpha : '') : 'Awaiting a scored proposal'}</dd></div>
            <div><dt>Ledger status</dt><dd>{evidence ? <StatusBadge value={evidence.valid ? 'VERIFIED' : 'INVALID'} /> : 'Verification unavailable'}</dd></div>
          </dl>
        </Card>
        <Card title="Recent evidence" action={<TextLink href="#evidence">Explore</TextLink>}>
          {evidence?.events.length ? <ul className="compact-list">{evidence.events.slice(-3).reverse().map(event => <li key={event.position}><div><strong>{event.action.replaceAll('_',' ')}</strong><small>{instant(event.at)}</small></div><code>#{event.position}</code></li>)}</ul> : <p className="muted">Events appear after the first signed mandate.</p>}
        </Card>
      </div>
    </div>
  </>
}

export function MandateSelect({ mandates, id, setId }: { mandates: Mandate[]; id: string; setId: (id: string) => void }) {
  return <label className="control">Signed mandate<select value={id} onChange={event => setId(event.target.value)}>
    <option value="">Select a signed mandate</option>
    {mandates.map(item => <option value={item.id} key={item.id}>{item.instruction.slice(0, 108)}</option>)}
  </select></label>
}
