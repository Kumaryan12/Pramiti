import { useRef, useState } from 'react'
import { Check, Download, FileSignature, FlaskConical, Layers3, Play, ShieldCheck, ShoppingBag, UserRoundCheck } from 'lucide-react'
import { label, money, type Evidence, type EvidenceEvent, type Mandate, type Payment, type Product } from './api'
import {
  ActionLink, Card, CopyableIdentifier, EmptyState, FilterToolbar, instant, PageHeader, StatusBadge, TextLink, Timeline,
} from './components'
import { MandateSelect, scenarios, type Scenario } from './overview'
import { asRecord } from './payments'

const eventNames: Record<string,string> = {
  user_instruction:'User instruction recorded', mandate_approved:'Mandate signed', agent_observations:'Agent observations',
  agent_proposal:'Payment proposal', verification:'Verification decision', human_review:'Human review',
  simulated_settlement:'Simulated settlement',
}
const eventIcons = {
  user_instruction:FileSignature, mandate_approved:FileSignature, agent_observations:ShoppingBag, agent_proposal:ShoppingBag,
  verification:ShieldCheck, human_review:UserRoundCheck, simulated_settlement:Check,
}
function eventTitle(action: string) { return eventNames[action] ?? label(action) }
function text(value: unknown) { return typeof value === 'string' && value.trim() ? value : undefined }
function signedPayload(value: unknown) {
  if (typeof value !== 'string') return {}
  try { return asRecord(JSON.parse(value)) } catch { return {} }
}
function eventFields(event: EvidenceEvent) {
  const detail = asRecord(event.detail)
  if (event.action === 'user_instruction') return [['Instruction',text(detail.instruction)]]
  if (event.action === 'mandate_approved') {
    const payload = signedPayload(detail.payload)
    return [['Instruction',text(payload.instruction)],['Expiry',typeof payload.expires_at === 'string' ? instant(payload.expires_at) : undefined],
      ['Per-payment limit',typeof payload.max_amount === 'number' ? money(payload.max_amount) : undefined],['Signature',text(detail.signature)]]
  }
  if (event.action === 'agent_observations') {
    const product = asRecord(detail.selected_listing)
    const tool = asRecord(detail.tool_call)
    return [['Selected listing',text(product.title)],['Merchant observation',text(product.description)],['Tool call',text(tool.name)],['Model',text(detail.model)]]
  }
  if (event.action === 'agent_proposal') {
    const proposal = asRecord(detail.proposal)
    return [['Product',text(proposal.product_id)],['Merchant',text(proposal.merchant)],
      ['Amount',typeof proposal.amount==='number' ? money(proposal.amount) : undefined],['Rationale',text(detail.rationale)]]
  }
  if (event.action === 'verification') return [['Decision',text(detail.decision)],
    ['Recorded reason',Array.isArray(detail.reasons) ? detail.reasons.filter(v=>typeof v==='string').join(' · ') || undefined : undefined]]
  if (event.action === 'human_review') return [['Recorded outcome',typeof detail.approved==='boolean' ? (detail.approved?'Approved':'Rejected') : undefined],['Requested decision',text(detail.decision)],['Reviewer note',text(detail.note)]]
  if (event.action === 'simulated_settlement') return [['Status',text(detail.status)],['Reference',text(detail.reference)],['Rail',text(detail.rail)]]
  return []
}

function EvidenceCard({ event }: { event:EvidenceEvent }) {
  const fields = eventFields(event).filter(([,value])=>value)
  const readable = event.action==='mandate_approved' ? fields.find(([name])=>name==='Expiry') : fields[0]
  return <>{readable && <p className="event-summary">{readable[0]} · {readable[1]}</p>}<details className="record-disclosure evidence-event">
    <summary>Inspect event <code>{event.digest.slice(0,12)}</code></summary>
    <div className="record-body">
      {fields.length ? <dl className="detail-list">{fields.map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl> :
        <p>Insufficient evidence for a structured summary. Inspect the recorded payload below.</p>}
      <dl className="detail-list evidence-ids">
        <div><dt>Entity ID</dt><dd><CopyableIdentifier name="entity ID" value={event.entity} compact/></dd></div>
        <div><dt>Event digest</dt><dd><CopyableIdentifier name="event digest" value={event.digest} compact/></dd></div>
        <div><dt>Previous digest</dt><dd><CopyableIdentifier name="previous digest" value={event.previous} compact/></dd></div>
      </dl>
      <details className="record-disclosure"><summary>Raw JSON</summary><pre>{JSON.stringify(event,null,2)}</pre></details>
    </div>
  </details></>
}

export function EvidenceExplorer({ evidence, payments, catalogue, initialId }: {
  evidence?: Evidence; payments: Payment[]; catalogue:Product[]; initialId?:string;
}) {
  const [transactionId,setTransaction] = useState(initialId ?? '')
  const [type,setType] = useState('')
  const [direction,setDirection] = useState(initialId ? 'oldest' : 'newest')
  const active = payments.find(item=>item.id===transactionId)
  const items = (evidence?.events ?? []).filter(event=>
    (!type || event.action===type) &&
    (!transactionId || [transactionId,active?.proposal.mandate_id].includes(event.entity)))
  const exportable = evidence && items.length > 0
  function download() {
    if (!exportable) return
    const body = {head:evidence.head, count:evidence.count, verified:evidence.valid, transaction_id:transactionId || null, events:items}
    const url = URL.createObjectURL(new Blob([JSON.stringify(body,null,2)],{type:'application/json'}))
    const link = document.createElement('a')
    link.href=url; link.download='pramiti-evidence'+(transactionId ? '-'+transactionId.slice(0,8) : '')+'.json'
    link.click()
    setTimeout(()=>URL.revokeObjectURL(url),1000)
  }
  return <>
    <PageHeader title="Evidence explorer" description="Trace the mandate, observations, decision and settlement through recorded events."
      actions={<><button type="button" className="btn secondary" disabled={!exportable} onClick={download}><Download size={16} aria-hidden="true"/> Export visible events</button><ActionLink href="#ledger">Verify ledger</ActionLink></>}/>
    <div className="investigation-grid evidence-layout">
      <Card title="Event timeline" note={items.length + ' visible of ' + (evidence?.count ?? 0) + ' ledger events'}>
        <div className="form-stack">
          <FilterToolbar label="Evidence filters">
            <label className="control">Transaction<select value={transactionId} onChange={event=>setTransaction(event.target.value)}>
              <option value="">All transactions</option>
              {transactionId && !active && <option value={transactionId}>Unavailable transaction {transactionId.slice(0,8)}</option>}
              {payments.map(item=> <option key={item.id} value={item.id}>{catalogue.find(p=>p.id===item.proposal.product_id)?.title ?? item.proposal.product_id} · {item.id.slice(0,8)}</option>)}
            </select></label>
            <label className="control">Event type<select value={type} onChange={event=>setType(event.target.value)}><option value="">All events</option>
              {Object.entries(eventNames).map(([value,title])=><option value={value} key={value}>{title}</option>)}</select></label>
            <label className="control">Event order<select value={direction} onChange={event=>setDirection(event.target.value)}><option value="oldest">Oldest first</option><option value="newest">Newest first</option></select></label>
          </FilterToolbar>
          {items.length ? <Timeline entries={(direction==='oldest' ? items : [...items].reverse()).map(event=>({
            id:String(event.position), title:eventTitle(event.action), meta:'#'+event.position+' · '+instant(event.at),
            icon:eventIcons[event.action as keyof typeof eventIcons], body:<EvidenceCard event={event}/>,
          }))}/> : <EmptyState title="No matching evidence" description="Sign a mandate and run an agent proposal to create events, or clear the current filters." icon={Layers3}/>}
        </div>
      </Card>
      <div className="flow">
        <Card title="Ledger snapshot" note="Session evidence returned by the verifier">
          {evidence ? <div className="form-stack"><StatusBadge value={evidence.valid ? 'VERIFIED' : 'INVALID'}/>
            <div><strong className="small-label">Current head</strong><CopyableIdentifier value={evidence.head} name="ledger head"/></div>
            <p className="muted">External checkpoint · {evidence.checkpoint_found===null ? 'Not supplied for this snapshot' : evidence.checkpoint_found ? 'Found' : 'Unavailable'}.</p>
          </div> : <p className="muted">Verification not run.</p>}
        </Card>
        {active && <Card title="Selected transaction">
          <dl className="detail-list"><div><dt>Decision</dt><dd><StatusBadge value={active.decision}/></dd></div>
            <div><dt>Settlement</dt><dd><StatusBadge value={active.status}/></dd></div>
            <div><dt>Mandate ID</dt><dd><CopyableIdentifier value={active.proposal.mandate_id} name="mandate ID" compact/></dd></div></dl>
          <TextLink href={'#verification?tx='+active.id}>Inspect transaction</TextLink>
        </Card>}
      </div>
    </div>
  </>
}

export function Ledger({ evidence, busy, verify }: { evidence?:Evidence; busy:boolean; verify:(checkpoint:string)=>Promise<Evidence|undefined> }) {
  const [checkpoint,setCheckpoint] = useState('')
  const [formatError,setFormatError] = useState(false)
  const [result,setResult] = useState<Evidence>()
  const input = useRef<HTMLInputElement>(null)
  return <>
    <PageHeader title="Ledger Integrity" description="Recompute the session’s SHA-256 chain and compare it with an external checkpoint."/>
    <div className="investigation-grid">
      <Card title="Run integrity check" note="Paste a digest saved independently from the application to check historical continuity.">
        <form noValidate className="form-stack" onSubmit={async event=>{
          event.preventDefault()
          const value=checkpoint.trim().toLowerCase()
          if (value && !/^[a-f0-9]{64}$/.test(value)) { setFormatError(true);input.current?.focus();return }
          setFormatError(false)
          setResult(await verify(value))
        }}>
          <label className="control">Trusted checkpoint (optional)
            <input ref={input} value={checkpoint} onChange={event=>{setCheckpoint(event.target.value);setFormatError(false);setResult(undefined)}} placeholder="64-character SHA-256 digest" autoComplete="off"
              aria-invalid={formatError} aria-describedby={formatError ? 'checkpoint-format' : undefined}/>
            {formatError && <small id="checkpoint-format" className="field-error">Enter a 64-character hexadecimal SHA-256 digest.</small>}
          </label>
          <button className="btn primary" disabled={busy}><ShieldCheck size={16} aria-hidden="true"/>{busy ? 'Checking chain…' : 'Verify chain'}</button>
          <div role="status" className="ledger-result">
            {result ? <><StatusBadge value={result.valid ? (result.checkpoint_found===false ? 'UNKNOWN':'VERIFIED') : 'INVALID'}
              text={result.checkpoint_found===false && result.valid ? 'Checkpoint unavailable' : undefined}/>
              <p>{!result.valid ? 'The service reported an integrity failure for this ledger.' : result.checkpoint_found===false
                ? 'The chain passed verification. The supplied checkpoint is absent from the recorded history.'
                : result.checkpoint_found ? 'Evidence chain and checkpoint verified.' : 'Evidence chain verified.'}</p>
              <CopyableIdentifier name="verified ledger head" value={result.head}/></> :
              <StatusBadge value="UNKNOWN" text="Verification not run"/>}
          </div>
        </form>
      </Card>
      <Card title="Reference information">
        <div className="form-stack">
          {evidence && <div><strong className="small-label">Current ledger head · {evidence.count} events</strong><CopyableIdentifier value={evidence.head} name="current ledger head"/></div>}
          <p className="muted">A valid chain establishes record integrity within the verified history. It cannot establish whether an original instruction or observation was true.</p>
          <TextLink href="#evidence">Open evidence explorer</TextLink>
        </div>
      </Card>
    </div>
  </>
}

const offline = [
  {name:'Misleading specifications',surface:'Synthetic product records',slug:'misleading_specs',purpose:'Evaluate an inspection record that conflicts with merchant compatibility claims.'},
  {name:'Replay submissions',surface:'Proposal nonce',slug:'replay',purpose:'Evaluate how repeat proposal identifiers are handled.'},
  {name:'Split transactions',surface:'Cumulative spending cap',slug:'split_budget',purpose:'Evaluate individual proposals against a cumulative mandate.'},
  {name:'Concurrent spending',surface:'Reservation state',slug:'concurrent_budget',purpose:'Evaluate simultaneous commitments against the same spending cap.'},
]
export function AttackLab({ mandates, mandateId, setMandateId, run, busy, payments, evidence }: {
  mandates:Mandate[];mandateId:string;setMandateId:(id:string)=>void;run:(scenario:Scenario)=>void;busy:boolean;payments:Payment[];evidence?:Evidence;
}) {
  const [query,setQuery]=useState('')
  const keyword=query.toLowerCase().trim()
  const matches=(...values:string[])=>values.join(' ').toLowerCase().includes(keyword)
  const runs=payments.filter(p=>p.source==='scripted' && p.proposal.mandate_id===mandateId)
  const payment=runs[0]
  const [comparisonId,setComparisonId]=useState('')
  const previous=runs.slice(1).find(p=>p.id===comparisonId)
  const scenarioName=(id:string)=>{
    const detail=asRecord(evidence?.events.find(e=>e.entity===id && e.action==='agent_observations')?.detail)
    return scenarios.find(s=>s.key===detail.scenario)?.title ?? 'Scripted proposal'
  }
  const entry = payment && evidence?.events.find(event=>event.entity===payment.id && event.action==='agent_observations')
  const observed = asRecord(entry?.detail)
  const selected = asRecord(observed.selected_listing)
  return <>
    <PageHeader title="Attack laboratory" description="Run controlled scenarios against the synthetic catalogue. The real verifier records each outcome."
      context={<p className="eyebrow">Controlled simulations</p>}/>
    <Card title="Execution setup" note="The scripted runner submits only the supported sandbox scenarios.">
      <div className="field-grid"><MandateSelect mandates={mandates} id={mandateId} setId={setMandateId}/>
        <label className="control">Search scenarios<input type="search" placeholder="Objective, scenario or surface" value={query} onChange={e=>setQuery(e.target.value)}/></label>
      </div>
      {!mandates.length && <TextLink href="#mandates?next=demo">Create a signed demo mandate</TextLink>}
    </Card>
    <div className="scenario-list">
      {scenarios.filter(s=> matches(s.title,s.surface,s.purpose,s.detail,s.key==='substitution' ? 'merchant manipulation prompt influence misleading' : '')).map(({key,title,surface,purpose,icon:Icon})=><Card key={key} className="scenario-card">
        <span className="blank-icon"><Icon size={20} aria-hidden="true"/></span><h2>{title}</h2><p>{purpose}</p>
        <p><strong>Surface</strong> · {surface}</p>
        <button type="button" className="btn primary" onClick={()=>run(key)} disabled={busy || !mandateId}><Play size={15} aria-hidden="true"/> Run {title.toLowerCase()}</button>
      </Card>)}
    </div>
    {payment && <Card title="Latest recorded shopper run" note="Outcomes come from the verifier and the associated evidence event.">
      <dl className="detail-list"><div><dt>Recorded scenario</dt><dd>{scenarioName(payment.id)}</dd></div><div><dt>Agent observation</dt><dd>{text(selected.description) ?? 'Observation unavailable'}</dd></div>
        <div><dt>Proposed payment</dt><dd>{text(selected.title) ?? payment.proposal.product_id} · {money(payment.proposal.amount)}</dd></div>
        <div><dt>Policy checks</dt><dd>{Object.values(payment.checks).filter(Boolean).length}/{Object.keys(payment.checks).length} passed</dd></div>
        <div><dt>Verifier outcome</dt><dd><StatusBadge value={payment.decision}/></dd></div>
        <div><dt>Settlement</dt><dd><StatusBadge value={payment.status}/></dd></div></dl>
      <TextLink href={'#verification?tx='+payment.id}>Inspect recorded outcome</TextLink>
    </Card>}
    {payment && runs.length>1 && <Card title="Compare recorded runs" note="Compare two scripted proposals under the same signed mandate.">
      <label className="control">Earlier proposal<select value={previous?.id ?? ''} onChange={e=>setComparisonId(e.target.value)}>
        <option value="">Select a recorded run</option>{runs.slice(1).map(p=><option key={p.id} value={p.id}>{scenarioName(p.id)} · {money(p.proposal.amount)} · {p.id.slice(0,8)}</option>)}
      </select></label>
      {previous && <div className="run-comparison">{[previous,payment].map(p=><article key={p.id}><h3>{scenarioName(p.id)}</h3>
        <p>{p.proposal.product_id} · {money(p.proposal.amount)}</p><StatusBadge value={p.decision}/><p>{p.reasons.join(' · ')}</p>
        <TextLink href={'#verification?tx='+p.id}>Inspect transaction</TextLink></article>)}</div>}
    </Card>}
    <Card title="Offline experiment families" note="These cases are available as recorded research results. The browser runner covers the scenarios above.">
      <div className="offline-list">{offline.filter(s=>matches(s.name,s.surface,s.purpose)).map(item=><article key={item.slug}><h3>{item.name}</h3><p>{item.purpose}</p>
        <TextLink href={'#analytics?family='+item.slug}>View measured results</TextLink></article>)}</div>
      {!scenarios.some(s=>matches(s.title,s.surface,s.purpose,s.detail,s.key==='substitution' ? 'merchant manipulation prompt influence misleading' : '')) &&
        !offline.some(s=>matches(s.name,s.surface,s.purpose)) && <p className="muted">No scenarios match this search.</p>}
    </Card>
  </>
}

export function Documentation() {
  return <>
    <PageHeader title="Technical Documentation" description="Understand the sandbox, evidence model and research assumptions."/>
    <div className="scenario-list">
      <Card title="Competition overview" note="Public summary of the verifier, available scenarios and research scope."><TextLink href="/overview.html">Read project overview</TextLink></Card>
      <Card title="API reference" note="Inspect the FastAPI request and response contracts."><TextLink href="/docs">Open API documentation</TextLink></Card>
      <Card title="Demo walkthrough" note="Start with signed intent and follow a proposal through the evidence ledger."><TextLink href="#demo">Launch the walkthrough</TextLink></Card>
      <Card title="Evaluation and limitations" note="Explore matched review rates, cohort results and conformal diagnostics."><TextLink href="#analytics">Open evaluation analytics</TextLink></Card>
    </div>
    <div className="callout neutral"><FlaskConical size={19} aria-hidden="true"/><p>PRAMITI is a research prototype using synthetic catalogue data and simulated settlement.</p></div>
  </>
}
