import { ClipboardList, FileKey2, Fingerprint, Play, ScanLine, ShoppingBag } from 'lucide-react'
import { label, money, type Evidence, type Mandate, type Payment, type Product } from './api'
import { ActionLink, Card, CopyableIdentifier, PageHeader, StatusBadge, StepIndicator, TextLink } from './components'
import { MandateSelect, scenarios, type Scenario } from './overview'
import { asRecord } from './payments'

export function Demo({ mandates, mandateId, setMandateId, catalogue, payment, evidence, busy, run }: {
  mandates:Mandate[]; mandateId:string; setMandateId:(id:string)=>void; catalogue:Product[]; payment?:Payment;
  evidence?:Evidence; busy:boolean; run:(scenario:Scenario)=>void
}) {
  const mandate=mandates.find(m=>m.id===mandateId)
  const result=payment?.proposal.mandate_id===mandateId ? payment : undefined
  const events=evidence?.events.filter(event=>result && event.entity===result.id) ?? []
  const observation=asRecord(events.find(e=>e.action==='agent_observations')?.detail)
  const listing=asRecord(observation.selected_listing)
  const product=catalogue.find(p=>p.id===result?.proposal.product_id)
  const passed=result ? Object.values(result.checks).filter(Boolean).length : 0
  const stage=!mandate ? 0 : !result ? 1 : result.status==='PENDING' ? 2 : 3
  return <>
    <PageHeader title="Live Demo" description="Follow one payment from the user’s signed instruction to the verifier’s decision and its evidence." context={<p className="eyebrow">Interactive walkthrough</p>}/>
    <div className="journey-progress"><StepIndicator current={stage} steps={['Authorise intent','Run the agent','Inspect decision','Trace outcome']}/></div>
    <section className="journey-control">
      <div className="journey-emblem"><Fingerprint size={32}/></div><div><p className="kicker">Scripted agent · Simulated payments</p><h2>{!mandate ? 'What may the agent buy?' : 'Choose a payment scenario.'}</h2>
        <p>{!mandate ? 'Start with the sample charger instruction. Review the spending limits and sign before the shopper can act.' : 'Each run submits a fresh proposal against your selected mandate.'}</p></div>
      {!mandate && <ActionLink href="#mandates?next=demo">Create demo mandate</ActionLink>}
      {mandates.length>0 && <MandateSelect mandates={mandates} id={mandateId} setId={setMandateId}/>}
      {mandate && <div className="run-options">{scenarios.map(({key,title,detail,icon:Icon})=><button type="button" key={key} disabled={busy} onClick={()=>run(key)} aria-label={'Run '+title}>
        <Icon size={18}/><span><strong>{title}</strong><small>{detail}</small></span><Play size={14}/></button>)}</div>}
    </section>
    <div className="journey-grid">
      <Card className="journey-panel"><div className="actor"><FileKey2 size={16}/> User</div><h2>Signed intent</h2>
        {mandate ? <><blockquote>{mandate.instruction}</blockquote><dl className="journey-fields">
          <div><dt>Payment limit</dt><dd>{money(mandate.max_amount)}</dd></div><div><dt>Total authorised</dt><dd>{money(mandate.cumulative_limit)}</dd></div>
          <div><dt>Required attributes</dt><dd>{mandate.requirements.join(' · ') || 'None specified'}</dd></div>
          <div><dt>Mandate ID</dt><dd><CopyableIdentifier value={mandate.id} name="mandate ID" compact/></dd></div></dl></> :
          <p>The original instruction, required attributes and approved limits appear after signing.</p>}
      </Card>
      <Card className="journey-panel"><div className="actor"><ShoppingBag size={16}/> Agent</div><h2>Catalogue & proposal</h2>
        {result ? <><div className="journey-price">{money(result.proposal.amount)}</div><strong>{product?.title ?? result.proposal.product_id}</strong>
          <p>{result.rationale}</p><div className="merchant-note"><span>Merchant-controlled listing</span><strong>{result.proposal.merchant}</strong><p>{typeof listing.description==='string' ? listing.description : 'Observation unavailable.'}</p></div>
          {Array.isArray(observation.observed_products) && <details className="record-disclosure"><summary>Observed catalogue ({observation.observed_products.length})</summary><ul className="plain-list">{observation.observed_products.map(id=><li key={String(id)}>{catalogue.find(p=>p.id===id)?.title ?? String(id)}</li>)}</ul></details>}</> :
          <p>The scripted shopper reads merchant listings and submits a proposed item, merchant and amount.</p>}
      </Card>
      <Card className="journey-panel"><div className="actor"><ScanLine size={16}/> Verifier</div><h2>Independent decision</h2>
        {result ? <><div role="status"><StatusBadge value={result.decision}/></div><p>{result.reasons.map(label).join(' · ')}</p>
          <details className="record-disclosure"><summary>Policy checks · {passed}/{Object.keys(result.checks).length}</summary><ul className="plain-list">{Object.entries(result.checks).map(([key,ok])=><li key={key}>{label(key)} · {ok?'passed':'failed'}</li>)}</ul></details>
          <dl className="journey-fields"><div><dt>Calibrated prediction set</dt><dd>{result.semantic ? '{'+result.semantic.prediction_set.join(', ')+'}' : 'No score recorded'}</dd></div>
          {result.semantic?.alpha!==undefined && <div><dt>Calibration alpha</dt><dd>{result.semantic.alpha}</dd></div>}</dl>
          <TextLink href={'#verification?tx='+result.id}>Inspect transaction</TextLink></> :
          <p>The firewall checks the signed terms. Eligible proposals can receive a calibrated assessment before the final decision.</p>}
      </Card>
    </div>
    {result && <Card className="journey-outcome"><div><div className="actor"><ClipboardList size={16}/> Recorded outcome</div>
      <h2>{result.status==='PENDING' ? 'A reviewer must decide.' : result.status==='SETTLED' ? 'Simulated settlement recorded.' : 'Settlement blocked.'}</h2>
      <p>{result.review ? 'Human decision · '+(result.review.approved?'Approved':'Rejected') : events.length+' transaction events in the session ledger'}
      {result.settlement && <> · <CopyableIdentifier value={result.settlement.reference} name="settlement reference" compact/></>}</p></div>
      <div className="row-actions">{result.status==='PENDING' && <ActionLink href={'#review?tx='+result.id}>Open human review</ActionLink>}<a className="btn secondary" href={'#evidence?tx='+result.id}>Trace evidence</a></div></Card>}
    <div className="visually-hidden" role="status">{busy ? 'Submitting the scenario for verification' : ''}</div>
  </>
}
