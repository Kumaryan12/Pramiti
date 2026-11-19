import { useEffect, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowRight, Check, CircleAlert, FileCheck2, FileSignature, FlaskConical, GitBranch,
  Layers3, ListFilter, LockKeyhole, Play, ShieldCheck, ShoppingBag, TriangleAlert, UserRoundCheck, X,
} from 'lucide-react'
import { api, money, type Evidence, type Mandate, type Payment, type Product } from './api'
import {
  ActionLink, Card, ChartContainer, EmptyState, instant, PageHeader, StatisticCard, StatusBadge, TextLink,
  TransactionTable,
} from './components'
import { Brand, ThemeButton } from './shell'

const pipeline = [
  { title: 'User instruction', icon: FileCheck2 }, { title: 'Signed mandate', icon: FileSignature },
  { title: 'AI shopping agent', icon: ShoppingBag }, { title: 'Policy firewall', icon: ShieldCheck },
  { title: 'Calibrated gate', icon: Activity }, { title: 'Payment decision', icon: UserRoundCheck },
  { title: 'Evidence ledger', icon: Layers3 },
]

export const scenarios = [
  { key: 'legitimate', title: 'Legitimate payment', icon: ShieldCheck, detail: 'The agent proposes the authorized 65W charger.', surface: 'Synthetic catalogue', purpose: 'Establish a control using the product named by the signed mandate.' },
  { key: 'over_budget', title: 'Policy violation', icon: TriangleAlert, detail: 'The agent proposes a charger above the default payment limit.', surface: 'Payment amount', purpose: 'Test how the firewall handles a proposal beyond the signed cap.' },
  { key: 'substitution', title: 'Suspicious substitution', icon: GitBranch, detail: 'A merchant claim steers the agent toward a cheaper charger.', surface: 'Merchant listing description', purpose: 'Test whether an in-budget substitution has independent evidence of compatibility.' },
] as const
export type Scenario = typeof scenarios[number]['key']

export function Landing() {
  const [catalogue, setCatalogue] = useState<Product[]>([])
  useEffect(() => { void api<Product[]>('/catalogue').then(setCatalogue).catch(() => {}) }, [])
  const intended = catalogue.find(p => p.id === 'assemble-65')
  const proposed = catalogue.find(p => p.id === 'compact-20')
  return <div className="public-site">
    <a href="#public-main" className="skip-link" onClick={event => {
      event.preventDefault()
      document.getElementById('public-main')?.focus()
    }}>Skip to main content</a>
    <header className="public-header"><div className="public-container public-nav">
      <Brand /><nav aria-label="Public pages">
        <a href="/overview.html">Project overview</a><a href="#analytics">Research</a>
        <ThemeButton /><a className="btn secondary" href="#dashboard">Open workspace</a>
      </nav>
    </div></header>
    <main id="public-main" tabIndex={-1}>
      <section className="public-hero">
        <div className="public-container hero-layout">
          <div className="hero-copy">
            <p className="hero-eyebrow"><span/> Agentic AI · Financial security · Research prototype</p>
            <h1>Autonomous payments.<br/><em>Verifiable intent.</em></h1>
            <p className="hero-description">PRAMITI independently checks whether AI-agent transactions match user-approved intentions, escalates uncertain decisions, and preserves verifiable evidence for financial investigations.</p>
            <div className="row-actions hero-actions"><ActionLink href="#demo">Launch Interactive Demo</ActionLink>
              <a className="btn hero-secondary" href="#analytics">Explore the Research</a></div>
            <p className="hero-foot"><FlaskConical size={16} aria-hidden="true"/> Research prototype <span aria-hidden="true">·</span> Simulated payments only</p>
          </div>
          <div className="hero-preview" aria-label="Demo scenario preview">
            <div className="preview-top"><div className="preview-icon"><ShieldCheck size={22} aria-hidden="true"/></div>
              <div><strong>Payment assurance</strong><small>Demo transaction preview</small></div><span>INR</span></div>
            <div className="preview-body">
              <div className="preview-title"><div><p>Scenario</p><h2>Product substitution</h2></div><ArrowDownRight size={24} aria-hidden="true"/></div>
              <div className="preview-pair">
                <div><span>Signed intent</span><strong>{intended?.title ?? '65W USB-C charger'}</strong><small>65W power delivery required</small></div>
                <div><span>Agent proposal</span><strong>{proposed?.title ?? '20W USB-C charger'}</strong><small>{proposed ? money(proposed.amount) + ' · ' + proposed.merchant : 'Lower-priced candidate'}</small></div>
              </div>
              <div className="preview-alert"><TriangleAlert size={18} aria-hidden="true"/><div><strong>Compatibility needs evidence</strong><p>The merchant claims compatibility. The independent record lacks the required 65W rating.</p></div></div>
              <a href="#demo" className="preview-link">Run this scenario <ArrowRight size={15} aria-hidden="true"/></a>
            </div>
          </div>
        </div>
      </section>
      <section className="problem-band"><div className="public-container">
        <p className="eyebrow">The authorization gap</p>
        <h2>A payment can be authorised without being intended.</h2>
        <p>An agent can stay within its spending limit while buying a lower-specification charger. An independent check compares the proposal with the signed requirements and the available product evidence.</p>
      </div></section>
      <section className="public-container public-section">
        <div className="public-section-head"><p className="eyebrow">From intent to evidence</p><h2>One traceable decision path</h2>
          <p>The calibrated gate is applied when configured. Hard policy failures take precedence.</p></div>
        <ol className="architecture-strip" aria-label="Payment assurance architecture">{pipeline.map(({title, icon: Icon}) => <li key={title}><Icon size={20} aria-hidden="true"/><span>{title}</span></li>)}</ol>
        <div className="public-capabilities">
          <article><LockKeyhole aria-hidden="true"/><h3>Verify intent</h3><p>Check signed constraints, merchant scope, cumulative spending and independently recorded product attributes.</p></article>
          <article><Activity aria-hidden="true"/><h3>Calibrate intervention</h3><p>Use class-conditional prediction sets to route eligible, uncertain cases to a person.</p></article>
          <article><Layers3 aria-hidden="true"/><h3>Preserve evidence</h3><p>Review agent observations, policy checks and simulated settlements in a verifiable chain.</p></article>
        </div>
      </section>
      <section className="research-band"><div className="public-container">
        <div><p className="eyebrow">Synthetic evaluation</p><h2>Compare policies at the same review budget.</h2>
          <p>Inspect the executed experiments, held-out cases and class-conditional exchangeability assumption. The evaluation depends on synthetic inspection records and shows where the prototype needs stronger evidence.</p></div>
        <a className="btn secondary" href="#analytics">View evaluation analytics <ArrowRight size={16} aria-hidden="true"/></a>
      </div></section>
      <section className="public-container public-final"><h2>See how PRAMITI evaluates an AI-agent payment.</h2><ActionLink href="#demo">Launch Interactive Demo</ActionLink></section>
    </main>
    <footer className="public-footer"><div className="public-container"><Brand /><span>Proof of Intent for Agentic Finance</span><span>Verify intent. Control risk. Preserve evidence.</span></div></footer>
  </div>
}

function ActivityChart({ payments }: { payments: Payment[] }) {
  const days = Array.from({length: 7}, (_, i) => {
    const day = new Date()
    day.setDate(day.getDate() - (6 - i))
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
  if (!days.some(d => d.approve + d.review + d.reject)) return <div className="chart-placeholder"><Activity size={22} aria-hidden="true"/><p>No decisions in the last seven days.</p></div>
  return <>
    <div className="activity-chart" aria-hidden="true">{days.map(day => <div className="activity-day" key={day.day}>
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
  const pending = payments.filter(item => item.status === 'PENDING')
  const settled = payments.filter(item => item.status === 'SETTLED')
  const decisions = (d: Payment['decision']) => payments.filter(item => item.decision === d).length
  const observedModel = payments.some(item => item.semantic)
  const count = payments.length
  return <>
    <PageHeader title="Risk dashboard" description="Monitor agent payment decisions, review exceptions, and trace settlement evidence."
      context={<p className="eyebrow">Workspace overview</p>} actions={<><button className="btn secondary" onClick={onRefresh} disabled={busy}>Refresh</button><ActionLink href="#demo">Run Demo</ActionLink></>}/>
    <div className="data-context"><span><FlaskConical size={16} aria-hidden="true"/> Synthetic payment workspace</span><span role="status">{busy ? 'Refreshing session data' : refreshed ? 'Updated ' + instant(refreshed) : 'Awaiting session data'}</span></div>
    <div className="stats-grid">
      <StatisticCard title="Transactions" value={count} detail="All proposals in this session" icon={ListFilter}/>
      <StatisticCard title="Auto-approved" value={decisions('ALLOW')} detail={count + ' total proposals'} icon={Check} tone="success"/>
      <StatisticCard title="Escalated" value={decisions('ESCALATE')} detail={count + ' total proposals'} icon={ArrowDownRight} tone="warning"/>
      <StatisticCard title="Rejected" value={decisions('REJECT')} detail={count + ' total proposals'} icon={X} tone="danger"/>
      <StatisticCard title="Pending review" value={pending.length} detail={decisions('ESCALATE') + ' escalated proposals'} icon={UserRoundCheck} tone="warning"/>
    </div>
    <div className="overview-grid">
      <div className="flow">
        <Card title="Recent transactions" note="Latest proposals in this sandbox session" action={<TextLink href="#verification">View transactions</TextLink>} className="table-card">
          {count ? <TransactionTable rows={payments.slice(0, 5)} catalogue={catalogue} compact /> : <EmptyState title="No payment proposals yet" description="Sign a demo mandate, run the shopper, and inspect the verifier’s decision." icon={ShoppingBag} action={<ActionLink href="#demo">Start the demo</ActionLink>}/>}
        </Card>
        <ChartContainer title="Decisions over time" note="Last 7 calendar days in this browser’s time zone">
          <ActivityChart payments={payments}/>
        </ChartContainer>
      </div>
      <div className="flow">
        <Card title="Needs attention" note="Outstanding human review">
          {pending.length ? <ul className="compact-list">{pending.slice(0, 3).map(item => <li key={item.id}>
            <div><strong>{item.proposal.merchant}</strong><small>{money(item.proposal.amount)} · {item.reasons[0]}</small></div><a className="text-link" href={'#review?tx=' + item.id}>Review<span className="visually-hidden">{' ' + item.id}</span></a>
          </li>)}</ul> : <div className="inline-empty"><Check size={18} aria-hidden="true"/> No proposals waiting for review.</div>}
        </Card>
        <Card title="Verification and outcome">
          <dl className="detail-list">
            <div><dt>Settled in simulation</dt><dd className="amount">{settled.length} · {money(settled.reduce((sum,item) => sum + item.proposal.amount, 0))}</dd></div>
            <div><dt>Calibrated model</dt><dd>{observedModel ? 'Scoring observed' : 'Awaiting a scored proposal'}</dd></div>
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

export function Demo({ mandates, mandateId, setMandateId, busy, run }: {
  mandates: Mandate[]; mandateId: string; setMandateId: (id: string) => void; busy: boolean; run: (scenario: Scenario) => void
}) {
  return <>
    <PageHeader title="Live demonstration" description="Run three scripted proposals through the actual verifier and follow the evidence for each decision."/>
    <Card title="Choose the signed intent" note="Use the default 65W charger policy to reproduce the competition walkthrough.">
      {mandates.length ? <MandateSelect mandates={mandates} id={mandateId} setId={setMandateId} /> :
        <EmptyState title="Start with a signed mandate" description="Review the default limits and product requirements, then sign in your browser."
          icon={FileSignature} action={<ActionLink href="#mandates?next=demo">Create demo mandate</ActionLink>}/>}
    </Card>
    <div className="scenario-list">{scenarios.map(({key,title,detail,icon:Icon}) => <Card key={key} className="scenario-card">
      <span className="blank-icon"><Icon size={20} aria-hidden="true"/></span><h2>{title}</h2><p>{detail}</p>
      <button className="btn secondary" type="button" aria-label={'Run ' + title} onClick={() => run(key)} disabled={!mandateId || busy}><Play size={15} aria-hidden="true"/> Run scenario</button>
    </Card>)}</div>
    <div className="callout neutral"><CircleAlert size={19} aria-hidden="true"/><p>Each run creates a proposal in your own sandbox. Successful approvals produce simulated settlement references.</p></div>
  </>
}

export function MandateSelect({ mandates, id, setId }: { mandates: Mandate[]; id: string; setId: (id: string) => void }) {
  return <label className="control">Signed mandate<select value={id} onChange={event => setId(event.target.value)}>
    <option value="">Select a signed mandate</option>
    {mandates.map(item => <option value={item.id} key={item.id}>{item.instruction.slice(0, 108)}</option>)}
  </select></label>
}
