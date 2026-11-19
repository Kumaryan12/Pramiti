import { useState } from 'react'
import {
  ArrowRight, Check, CircleAlert, Fingerprint, GitBranch, Layers3, Play, ScanLine, Search,
  ShieldCheck, ShoppingBag, Terminal, UserRoundCheck,
} from 'lucide-react'
import { label, money, type Evidence, type Mandate, type Payment, type Product } from './api'
import {
  ActionLink, Card, ConfirmationDialog, CopyableIdentifier, EmptyState, FilterToolbar, instant, PageHeader, StatusBadge,
  TextLink, Timeline, TransactionTable,
} from './components'
import { MandateSummary } from './mandates'
import { MandateSelect } from './overview'

export const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const string = (value: unknown) => typeof value === 'string' ? value : undefined
const sourceName = (value: string) => value === 'llm' ? 'Live LLM' : value === 'scripted' ? 'Scripted agent' : 'Manual proposal'
const productTitle = (item: Payment, catalogue: Product[]) => catalogue.find(p => p.id === item.proposal.product_id)?.title ?? item.proposal.product_id

export function Agent({ mandates, mandateId, setMandateId, catalogue, payment, evidence, busy, llmEnabled, onRun }: {
  mandates: Mandate[]; mandateId: string; setMandateId: (value:string)=>void; catalogue: Product[]; payment?: Payment;
  evidence?: Evidence; busy:boolean; llmEnabled:boolean; onRun:(mode:'scripted'|'llm',token:string)=>void
}) {
  const [mode,setMode] = useState<'scripted'|'llm'>('scripted')
  const [token,setToken] = useState('')
  const [query,setQuery] = useState('')
  const active = mandates.find(item=>item.id === mandateId)
  const entry = payment && evidence?.events.find(event=>event.entity===payment.id && event.action==='agent_observations')
  const observed = asRecord(entry?.detail)
  const listing = asRecord(observed.selected_listing)
  const call = asRecord(observed.tool_call)
  const observedProducts = Array.isArray(observed.observed_products) ? observed.observed_products.filter(item=>typeof item==='string') : []
  const visible = catalogue.filter(p=>[p.title,p.merchant,p.category].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
  return <>
    <PageHeader title="AI Agent" description="Follow the signed instructions, merchant inputs and proposal from selection through verification."
      actions={<a href="#demo" className="btn secondary">Run a guided scenario <ArrowRight size={16} aria-hidden="true"/></a>}/>
    <div className="investigation-grid">
      <div className="flow">
        <Card title="User-controlled instruction" note="Source · Signed spending mandate">
          {mandates.length ? <div className="form-stack"><MandateSelect mandates={mandates} id={mandateId} setId={setMandateId}/>
            {active && <div className="instruction-box"><span>Authorized intent</span><p>{active.instruction}</p><small className="muted">{money(active.max_amount)} per payment · {money(active.cumulative_limit)} cumulative</small></div>}
          </div> : <EmptyState title="A signed mandate is required" description="Define what the agent may purchase." action={<ActionLink href="#mandates">Create mandate</ActionLink>}/>}
        </Card>
        <Card title="Available products" note="Merchant-controlled descriptions · synthetic catalogue">
          <label className="control search-control">Search products or merchants<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label>
          {visible.length ? <div className="catalogue-list">{visible.map(product=><details key={product.id} className="record-disclosure">
            <summary><div><strong>{product.title}</strong><small>{product.merchant} · {product.category}</small></div><span className="amount">{money(product.amount)}</span></summary>
            <div className="record-body"><p>{product.description}</p><p>Claimed attributes · {product.requirements.join(', ')}</p></div>
          </details>)}</div> : <p className="muted">No matching products.</p>}
        </Card>
      </div>
      <div className="flow">
        <Card title="Run shopper" note="Agent-generated activity is recorded separately from verifier decisions.">
          <div className="form-stack">
            <div className="row-actions"><StatusBadge value="UNKNOWN" text={mode === 'llm' && llmEnabled ? 'Live LLM' : 'Scripted agent'}/>
              {!llmEnabled && <StatusBadge value="UNKNOWN" text="LLM unavailable"/>}</div>
            <label className="control">Agent mode<select value={mode} onChange={e=>setMode(e.target.value === 'llm' ? 'llm' : 'scripted')}>
              <option value="scripted">Scripted agent</option><option value="llm" disabled={!llmEnabled}>Live LLM{!llmEnabled ? ' · unavailable' : ''}</option></select></label>
            {mode === 'llm' && <label className="control">LLM operator token<input type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)}/></label>}
            <button type="button" className="btn primary" onClick={()=>onRun(mode,token)} disabled={busy || !active || (mode==='llm' && (!llmEnabled || !token.trim()))}>
              <Play size={16} aria-hidden="true"/>{busy ? 'Running agent…' : 'Propose payment'}</button>
          </div>
        </Card>
        <Card title="Agent activity" note={payment ? sourceName(payment.source) + ' · ' + instant(payment.created_at) : 'Run the shopper to record observations and decisions.'}>
          {payment ? <Timeline entries={[
            { id:'observe', title:'Catalogue observed', icon:Search, body:<><p>{entry ? observedProducts.length + ' product references recorded by the agent.' : 'Observation record unavailable.'}</p>
              {!!observedProducts.length && <details className="record-disclosure"><summary>Observed products</summary><ul className="plain-list">
                {observedProducts.map(id=><li key={id}>{catalogue.find(p=>p.id===id)?.title ?? id}</li>)}</ul></details>}
              {string(listing.description) && <p>Selected listing · {string(listing.description)}</p>}</> },
            { id:'tool', title:'Tool calls', icon:Terminal, body:<p>{string(call.name) ? string(call.name) + ' · ' + (string(call.product_id) ?? '') :
              payment.source==='scripted' ? 'Scripted catalogue selection.' : 'No tool call recorded.'}</p>, meta:string(observed.model) },
            { id:'proposal', title:'Payment proposed', icon:ShoppingBag, body:<p>{productTitle(payment,catalogue)} · {money(payment.proposal.amount)} · {payment.rationale}</p> },
            { id:'verify', title:'Independent verifier decision', icon:ShieldCheck, body:<div className="row-actions activity-result"><StatusBadge value={payment.decision}/>
              <TextLink href={'#verification?tx='+payment.id}>Inspect transaction</TextLink></div> },
          ]}/> : <EmptyState title="No shopper run selected" description="Run the shopper with a signed mandate to view its activity."/>}
        </Card>
      </div>
    </div>
  </>
}

const checks: Record<string,string> = {
  signature:'The recorded Ed25519 signature validates the approved mandate.',
  mandate_integrity:'The proposal refers to the signed mandate.',
  nonce_unique:'This nonce was checked for prior use.',
  catalog_integrity:'Amount, merchant and category agree with the server catalogue.',
  mandate_current:'The mandate must still be in its validity window.',
  single_payment_limit:'The proposed amount must fit the signed per-payment limit.',
  permitted_merchant:'The payment merchant must match the signed allowlist.',
  permitted_category:'The product category must match the signed allowlist.',
  cumulative_limit:'The payment and existing commitments must fit the cumulative cap.',
  substitution_policy:'A different SKU must be allowed by the substitution policy.',
  no_verified_spec_conflict:'An independently verified contradiction blocks approval.',
  required_evidence_policy:'The signed policy determines whether missing evidence must reject.',
}
function decisionReason(reason: string) {
  return checks[reason] ?? reason
}
const compatibilityText: Record<string,string> = {
  verified_compatible:'Verified compatible',
  verified_incompatible:'Verified incompatibility',
  insufficient_evidence:'Insufficient evidence',
  merchant_claim_only:'Merchant claim only',
}
export function CompatibilityEvidence({ payment }: { payment: Payment }) {
  const evidence = payment.compatibility
  if (!evidence) return <p className="muted">Product evidence unavailable.</p>
  return <div className="form-stack">
    <div className={'callout '+(evidence.status==='verified_compatible' ? 'success' : evidence.status==='verified_incompatible' ? 'danger' : 'warning')}>
      {evidence.status==='verified_compatible' ? <Check size={17} aria-hidden="true"/> : <CircleAlert size={17} aria-hidden="true"/>}<strong>{compatibilityText[evidence.status]}</strong>
    </div>
    <dl className="detail-list">
      <div><dt>Required attributes</dt><dd>{evidence.required.join(', ') || 'No explicit attributes'}</dd></div>
      <div><dt>Independently confirmed</dt><dd>{evidence.confirmed.join(', ') || 'None recorded'}</dd></div>
      {evidence.missing.length>0 && <div><dt>Unverified requirements</dt><dd>{evidence.missing.join(', ')}</dd></div>}
      {evidence.contradictions.length>0 && <div><dt>Verified conflicts</dt><dd>{evidence.contradictions.join(', ')}</dd></div>}
      {evidence.merchant_only.length>0 && <div><dt>Merchant claims only</dt><dd>{evidence.merchant_only.join(', ')}</dd></div>}
      <div><dt>Inspection reference</dt><dd>{evidence.evidence_reference ? <CopyableIdentifier value={evidence.evidence_reference} name="inspection reference"/> : 'Unavailable'}</dd></div>
    </dl>
  </div>
}

function policyValue(key: string, payment: Payment, mandate?: Mandate) {
  if (!mandate) return undefined
  if (key==='single_payment_limit') return money(payment.proposal.amount) + ' proposed · ' + money(mandate.max_amount) + ' maximum'
  if (key==='cumulative_limit') return money(mandate.cumulative_limit) + ' signed cap'
  if (key==='permitted_merchant') return mandate.merchants.join(', ') + ' allowed'
  if (key==='permitted_category') return mandate.categories.join(', ') + ' allowed'
  if (key==='mandate_current') return 'Valid until ' + instant(mandate.expires_at)
  return undefined
}

function DecisionExplanation({ payment, mandate, evidence }: { payment: Payment; mandate?: Mandate; evidence?: Evidence }) {
  const cryptoChecks = ['signature','mandate_integrity','nonce_unique']
  const firewallChecks = Object.entries(payment.checks).filter(([key])=>!cryptoChecks.includes(key))
  const proof = evidence?.events.find(event=>event.entity===payment.id && event.action==='verification')
  const prediction = payment.semantic
  return <Card className="pipeline-card" title="Verification pipeline" note="Signed authorization, policy controls and independent evidence">
    <Timeline entries={[
      { id:'mandate',title:'Mandate received',icon:ScanLine,meta:mandate ? 'Found' : 'Unavailable',
        body:<CopyableIdentifier value={payment.proposal.mandate_id} name="mandate ID" compact/> },
      { id:'crypto',title:'Cryptographic checks',icon:Fingerprint,meta:cryptoChecks.every(key=>payment.checks[key]) ? 'Passed' : 'Check results',
        body:<ul className="check-list">{cryptoChecks.map(key=><li key={key}><StatusBadge value={payment.checks[key] === undefined ? 'UNKNOWN' : payment.checks[key] ? 'ALLOW' : 'REJECT'} text={payment.checks[key] === undefined ? 'Unavailable' : payment.checks[key] ? 'Passed' : 'Failed'}/>
          <div><strong>{label(key)}</strong><p>{checks[key]}</p></div></li>)}</ul> },
      { id:'policy',title:'Policy firewall',icon:ShieldCheck,meta:firewallChecks.some(([,value])=>!value) ? 'Exceptions' : 'Passed',
        body:<details className="record-disclosure" open={firewallChecks.some(([,value])=>!value)}><summary>View policy checks <span>{firewallChecks.filter(([,ok])=>ok).length}/{firewallChecks.length} passed</span></summary>
          <ul className="check-list">{firewallChecks.map(([key,ok])=><li key={key}><StatusBadge value={ok?'ALLOW':'REJECT'} text={ok?'Passed':'Failed'}/>
            <div><strong>{label(key)}</strong><p>{checks[key] ?? 'Recorded policy check.'}</p>{policyValue(key,payment,mandate) && <p>{policyValue(key,payment,mandate)}</p>}</div></li>)}</ul></details> },
      { id:'semantic',title:'Semantic-intent evaluation',icon:GitBranch,meta:prediction ? 'Scored' : 'Unavailable',
        body:prediction ? <><p className="prediction-set" data-testid="prediction-set">Prediction set {'{'}{prediction.prediction_set.join(', ')}{'}'}</p>
          {prediction.alpha !== undefined && <p>Calibration alpha · {prediction.alpha}</p>}
          {Object.keys(prediction.p_values).length>0 && <details className="record-disclosure"><summary>Conformal p-values</summary><dl className="detail-list">
            {Object.entries(prediction.p_values).map(([key,p])=><div key={key}><dt>{key}</dt><dd>{p.toFixed(4)}</dd></div>)}</dl>
            <p>Coverage assumes class-conditional exchangeability. These values cannot establish settlement safety.</p></details>}</> :
          <p>No model output was recorded. Hard policy failures can end verification before scoring.</p> },
      { id:'decision',title:'Final verification decision',icon:UserRoundCheck,body:<StatusBadge value={payment.decision}/> },
      { id:'evidence',title:'Evidence recorded',icon:Layers3,meta:proof ? 'Event #' + proof.position : 'Record unavailable',
        body:<TextLink href={'#evidence?tx='+payment.id}>Open related evidence</TextLink> },
    ]}/>
  </Card>
}

export function Transactions({ payment, payments, catalogue, mandates, evidence }: {
  payment?: Payment; payments: Payment[]; catalogue: Product[]; mandates: Mandate[]; evidence?: Evidence;
}) {
  const [filter,setFilter] = useState('')
  const rows = payments.filter(item=>[item.id,item.proposal.merchant,productTitle(item,catalogue),item.decision].join(' ').toLowerCase().includes(filter.trim().toLowerCase()))
  return <>
    <PageHeader title="Transactions" description="Investigate authorization, verification and simulated settlement for each payment proposal."
      actions={<ActionLink href="#demo">Run Demo</ActionLink>}/>
    {payment && <>
      <Card className="decision-hero">
        <div>
          <h2>{productTitle(payment,catalogue)}</h2>
          <p>{payment.proposal.merchant} · {sourceName(payment.source)} · {instant(payment.created_at)}</p>
          <CopyableIdentifier value={payment.id} name="transaction ID" compact/>
        </div>
        <div className="decision-side"><StatusBadge value={payment.decision}/><strong className="amount">{money(payment.proposal.amount)}</strong>
          <StatusBadge value={payment.status} text={payment.status === 'SETTLED' ? 'Simulated settlement' : payment.status === 'REJECTED' ? 'Settlement blocked' : 'Awaiting review'}/></div>
      </Card>
      <div className="investigation-grid transaction-grid">
        <div className="flow">
          <Card className="cause-card" title="Why this decision">
            <ul className="decision-reasons">{payment.reasons.map(reason=><li key={reason}>{decisionReason(reason)}</li>)}</ul>
            {payment.status==='PENDING' && <ActionLink href={'#review?tx='+payment.id}>Open human review</ActionLink>}
            {payment.review && <p className="muted review-outcome">Review {payment.review.approved ? 'approved' : 'declined'}{payment.review.note ? ' · '+payment.review.note : ''}</p>}
            {payment.review?.failed_checks.length ? <p className="muted">Review recheck · {payment.review.failed_checks.map(label).join(', ')}</p> : null}
            {payment.settlement && <div className="settlement-ref"><strong>Simulated settlement reference</strong><CopyableIdentifier value={payment.settlement.reference} name="settlement reference"/></div>}
          </Card>
          <DecisionExplanation payment={payment} mandate={mandates.find(item=>item.id===payment.proposal.mandate_id)} evidence={evidence}/>
        </div>
        <div className="flow">
          <Card className="compatibility-card" title="Product evidence" note="Independent records and merchant claims"><CompatibilityEvidence payment={payment}/></Card>
          <Card className="rationale-card" title="Agent rationale"><p className="muted">{payment.rationale || 'No rationale recorded.'}</p><TextLink href={'#evidence?tx='+payment.id}>Read observations</TextLink></Card>
        </div>
      </div>
    </>}
    <Card title="Transaction history">
      {payments.length ? <div className="form-stack"><FilterToolbar><label className="control">Find transaction<input type="search" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Product, merchant, ID, or decision"/></label></FilterToolbar>
        {rows.length ? <TransactionTable rows={rows} catalogue={catalogue}/> : <p className="muted">No transactions match this search.</p>}</div> :
        <EmptyState title="No transactions recorded" description="Run a demonstration proposal or open the agent workspace." action={<ActionLink href="#demo">Start the demo</ActionLink>}/>}
    </Card>
  </>
}

export function Reviews({ payments, catalogue, mandates, selectedId, busy, onReview }: {
  payments: Payment[]; catalogue: Product[]; mandates: Mandate[]; selectedId?: string; busy:boolean;
  onReview:(id:string,decision:'approve'|'reject',note:string)=>Promise<Payment|undefined>;
}) {
  const [query,setQuery] = useState('')
  const [scope,setScope] = useState(selectedId && payments.some(p=>p.id===selectedId && p.status!=='PENDING') ? 'all' : 'pending')
  const [order,setOrder] = useState('newest')
  const [activeId,setActive] = useState(selectedId)
  const [notes,setNotes] = useState<Record<string,string>>({})
  const [confirmation,setConfirmation] = useState<{id:string; decision:'approve'|'reject'}>()
  const [notice,setNotice] = useState('')
  const reviewCases = payments.filter(p=>p.decision==='ESCALATE')
  const rows = reviewCases.filter(p=>(scope==='all' || (scope==='pending' ? p.status==='PENDING' : p.status!=='PENDING')) &&
    [p.id,p.proposal.merchant,productTitle(p,catalogue),money(p.proposal.amount),...p.reasons].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a,b)=>order==='amount' ? b.proposal.amount-a.proposal.amount :
      order==='oldest' ? (a.created_at ?? '').localeCompare(b.created_at ?? '') : (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  const active = rows.find(p=>p.id===activeId) ?? rows[0]
  const mandate = active && mandates.find(item=>item.id===active.proposal.mandate_id)
  const expected = mandate?.product_id && catalogue.find(item=>item.id===mandate.product_id)
  const note = active ? notes[active.id] ?? '' : ''
  const missing = Boolean(active?.compatibility?.missing.length)
  const hardFail = Boolean(active && Object.values(active.checks).some(ok=>!ok))
  const confirmationPayment = confirmation && reviewCases.find(p=>p.id===confirmation.id)
  async function confirm() {
    if (!confirmation || busy) return
    const {id,decision}=confirmation
    setConfirmation(undefined)
    const result = await onReview(id,decision,notes[id] ?? '')
    if (result) {
      setScope('all')
      setActive(id)
      setNotice(result.status === 'SETTLED' ? 'Review approved. Simulated settlement recorded.' : 'Review recorded. Transaction rejected.')
    }
  }
  return <>
    <PageHeader title="Human review" description="Triage exceptions, inspect the signed mandate, and record a decision."/>
    {notice && <div className="callout success" role="status"><Check size={18} aria-hidden="true"/><p>{notice}</p></div>}
    <Card title="Review queue" note={reviewCases.filter(p=>p.status==='PENDING').length + ' pending · ' + reviewCases.length + ' escalated in this session'}>
      <div className="form-stack">
        <FilterToolbar label="Review queue filters">
          <label className="control">Search cases<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Transaction ID, merchant, or reason"/></label>
          <label className="control">Review status<select value={scope} onChange={e=>setScope(e.target.value)}><option value="pending">Pending</option><option value="reviewed">Reviewed</option><option value="all">All cases</option></select></label>
          <label className="control">Sort by<select value={order} onChange={e=>setOrder(e.target.value)}><option value="newest">Newest received</option><option value="oldest">Oldest received</option><option value="amount">Highest amount</option></select></label>
        </FilterToolbar>
        {rows.length ? <div className="table-region" tabIndex={0} role="region" aria-label="Review cases">
          <table className="data-table review-table"><caption className="visually-hidden">Escalated proposals</caption>
            <thead><tr><th scope="col">Case and merchant</th><th scope="col">Amount</th><th scope="col">Escalation reason</th><th scope="col">Received</th><th scope="col">Status</th></tr></thead>
            <tbody>{rows.map(p=><tr key={p.id} className={active?.id===p.id ? 'selected-row' : ''}>
              <td><button className="table-link case-select" type="button" onClick={()=>{setActive(p.id);setNotice('')}} aria-pressed={active?.id===p.id}>{productTitle(p,catalogue)}</button>
                <small>{p.proposal.merchant} · <code>{p.id.slice(0,8)}</code></small></td>
              <td data-label="Amount" className="amount">{money(p.proposal.amount)}</td><td data-label="Reason">{p.reasons[0] ?? 'Reason unavailable'}</td><td data-label="Received" className="cell-time">{instant(p.created_at)}</td><td data-label="Status"><StatusBadge value={p.status}/></td>
            </tr>)}</tbody>
          </table></div> : <EmptyState title={reviewCases.length ? 'No matching review cases' : 'No escalations yet'} description="Escalated proposals appear here when the verifier needs a human decision."
            action={!reviewCases.length ? <ActionLink href="#demo">Run a scenario</ActionLink> : undefined}/>}
      </div>
    </Card>
    {active && <div className="investigation-grid review-detail" aria-label="Selected review case">
      <div className="flow">
        <Card title="Approved mandate">{mandate ? <><blockquote className="intent-quote">{mandate.instruction}</blockquote><details className="record-disclosure"><summary>Signed conditions</summary><MandateSummary mandate={mandate} catalogue={catalogue} compact/></details></> : <p className="muted">Mandate unavailable.</p>}</Card>
        <Card title="Proposed transaction">
          <dl className="detail-list">
            <div><dt>Transaction ID</dt><dd><CopyableIdentifier value={active.id} name="transaction ID" compact/></dd></div>
            <div><dt>Expected product</dt><dd>{expected ? expected.title : 'See signed attributes'}</dd></div>
            <div><dt>Proposed product</dt><dd>{productTitle(active,catalogue)}</dd></div>
            <div><dt>Amount and merchant</dt><dd>{money(active.proposal.amount)} · {active.proposal.merchant}</dd></div>
          </dl>

        </Card>
      </div>
      <div className="flow">
        <Card title="Conditions requiring review">
          <ul className="decision-reasons">{active.reasons.map(reason=><li key={reason}>{decisionReason(reason)}</li>)}</ul>
          <CompatibilityEvidence payment={active}/>
          <details className="record-disclosure"><summary>Policy and model checks</summary><ul className="plain-list">{Object.entries(active.checks).map(([key,ok])=><li key={key}>{label(key)} · {ok?'passed':'failed'}</li>)}</ul>
            <p>{active.semantic ? 'Prediction set {'+active.semantic.prediction_set.join(', ')+'}' : 'No calibrated score recorded.'}</p></details>
        </Card>
      </div>
      <div className="flow">
        <Card title="Record human decision" className="review-controls">
          <div className="case-summary"><strong>{money(active.proposal.amount)}</strong><span>{active.proposal.merchant}</span><TextLink href={'#evidence?tx='+active.id}>Open relevant evidence</TextLink></div>
          {active.status==='PENDING' ? <div className="form-stack">
            <p className="muted">The server rechecks hard policies before simulated settlement.</p>
            <label className="control">Reviewer note {missing ? '(required to approve)' : '(optional)'}
              <textarea maxLength={1000} value={note} rows={3} onChange={e=>setNotes(current=>({...current,[active.id]:e.target.value}))}/></label>
            <div className="row-actions review-actions">
              <button type="button" className="btn primary" disabled={busy || hardFail || (missing && !note.trim())}
                onClick={()=>setConfirmation({id:active.id,decision:'approve'})}>Approve simulated settlement</button>
              <button type="button" className="btn secondary" disabled={busy} onClick={()=>setConfirmation({id:active.id,decision:'reject'})}>Reject</button>
            </div>
          </div> : <div className="form-stack"><StatusBadge value={active.status}/>
            <p className="muted">{active.review?.note || 'No review note recorded.'}</p><TextLink href={'#verification?tx='+active.id}>Inspect final transaction</TextLink>{active.source==='scripted' && <TextLink href={'#demo?tx='+active.id}>Return to demo outcome</TextLink>}</div>}
        </Card>
      </div>
    </div>}
    {confirmation && confirmationPayment && <ConfirmationDialog title={confirmation.decision==='approve' ? 'Approve this simulated settlement?' : 'Reject this payment proposal?'}
      action={confirmation.decision==='approve' ? 'Confirm approval' : 'Confirm rejection'} danger={confirmation.decision==='reject'}
      onConfirm={()=>void confirm()} onCancel={()=>setConfirmation(undefined)}>
      <p>{money(confirmationPayment.proposal.amount)} · {confirmationPayment.proposal.merchant}. This decision will be recorded in the evidence ledger.</p>
    </ConfirmationDialog>}
  </>
}
