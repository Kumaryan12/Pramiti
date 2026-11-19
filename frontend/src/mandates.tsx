import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check, FileSignature, LockKeyhole } from 'lucide-react'
import { money, type Mandate, type Product } from './api'
import { ActionLink, Card, CopyableIdentifier, EmptyState, instant, PageHeader, StatusBadge, StepIndicator } from './components'

const example = 'Buy the Assemble 65W USB-C charger with Power Delivery.'
const list = (value: string) => value.split(',').map(part => part.trim()).filter(Boolean)

function initialDraft() {
  const date = new Date(Date.now() + 24 * 3600000)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return {
    instruction: example, product_id: 'assemble-65', merchants: 'Circuit House', categories: 'electronics',
    requirements: '65w, usb-c, pd', max_amount: '3000', cumulative_limit: '6000',
    expires_at: date.toISOString().slice(0,16), consent: 'automatic' as Mandate['consent'],
    missing_evidence: 'review' as NonNullable<Mandate['missing_evidence']>, allow_substitutions: true,
  }
}
type Draft = ReturnType<typeof initialDraft>
type Field = keyof Draft

export function MandateSummary({ mandate, catalogue, compact = false }: { mandate: Mandate; catalogue: Product[]; compact?: boolean }) {
  const profile = [
    ['Expected product', mandate.product_id ? catalogue.find(p => p.id === mandate.product_id)?.title ?? mandate.product_id : 'Requirements only'],
    ['Payment limit', money(mandate.max_amount)], ['Cumulative limit', money(mandate.cumulative_limit)],
    ['Allowed merchants', mandate.merchants.join(', ')], ['Allowed categories', mandate.categories.join(', ')],
    ['Required attributes', mandate.requirements.join(', ') || 'None specified'],
    ['Substitutions', mandate.allow_substitutions ? 'May be considered by the verifier' : 'Disallowed'],
    ['Missing evidence', mandate.missing_evidence === 'reject' ? 'Reject' : 'Send for human review'],
    ['Consent mode', mandate.consent === 'review' ? 'Always require human approval' : 'Allow if verified'],
    ['Valid until', instant(mandate.expires_at)],
  ]
  return <div className={'mandate-summary' + (compact ? ' compact' : '')}>
    <div className="instruction-box"><span>User instruction</span><p>{mandate.instruction}</p></div>
    <dl className="detail-list">{profile.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
  </div>
}

export function Mandates({ catalogue, mandates, busy, next, onSign }: {
  catalogue: Product[]; mandates: Mandate[]; busy: boolean; next: 'demo' | 'agent';
  onSign: (policy: Mandate) => Promise<Mandate | undefined>
}) {
  const [draft,setDraft] = useState(initialDraft)
  const [step,setStep] = useState(0)
  const [errors,setErrors] = useState<Partial<Record<Field | 'consent_check',string>>>({})
  const [signed,setSigned] = useState<Mandate>()
  const [confirmed,setConfirmed] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const errorSummary = useRef<HTMLDivElement>(null)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    heading.current?.focus()
  }, [step])
  useEffect(() => { if (Object.keys(errors).length) errorSummary.current?.focus() }, [errors])

  function setValue<K extends Field>(key: K, value: Draft[K]) {
    setDraft(current => ({...current, [key]: value}))
    setConfirmed(false)
    if (errors[key]) setErrors(current => ({...current, [key]: undefined}))
  }
  const toPolicy = (id: string): Mandate => ({
    id, instruction: draft.instruction.trim(), product_id: draft.product_id || null,
    merchants: list(draft.merchants), categories: list(draft.categories), requirements: list(draft.requirements),
    max_amount: Math.round(Number(draft.max_amount)*100), cumulative_limit: Math.round(Number(draft.cumulative_limit)*100),
    expires_at: new Date(draft.expires_at).toISOString(), consent: draft.consent, missing_evidence: draft.missing_evidence,
    allow_substitutions: draft.allow_substitutions,
  })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const issues: typeof errors = {}
    if (step === 0 && !draft.instruction.trim()) issues.instruction = 'Enter a shopping instruction.'
    if (step === 1) {
      for (const key of ['max_amount','cumulative_limit'] as const) {
        const parsed = Number(draft[key])
        if (!Number.isFinite(parsed) || parsed < .01 || parsed > 1_000_000 || !/^\d+(\.\d{1,2})?$/.test(draft[key])) {
          issues[key] = 'Enter an amount from ₹0.01 to ₹10,00,000 with up to two decimal places.'
        }
      }
      for (const key of ['merchants','categories','requirements'] as const) {
        const items = list(draft[key])
        if (!items.length && (key !== 'requirements' || !draft.product_id)) issues[key] = 'Enter at least one value.'
        if (items.length > 20 || items.some(item => item.length > 120)) issues[key] = 'Use up to 20 values, each at most 120 characters.'
      }
      if (!Number.isFinite(Date.parse(draft.expires_at)) || Date.parse(draft.expires_at) <= Date.now()) {
        issues.expires_at = 'Choose a future expiry date and time.'
      }
    }
    if (step === 2 && !confirmed) issues.consent_check = 'Confirm the simulated spending terms before signing.'
    setErrors(issues)
    if (Object.keys(issues).length) return
    if (step < 2) { setStep(step + 1); return }
    const approved = await onSign(toPolicy(crypto.randomUUID()))
    if (approved) { setSigned(approved); setStep(3) }
  }
  function field(name: Field, caption: string, children: ReactNode, help?: string) {
    return <label className="control" htmlFor={'mandate-' + name}>{caption}{help && <small id={'help-' + name}>{help}</small>}
      {children}{errors[name] && <small className="field-error" id={'error-' + name}>{errors[name]}</small>}
    </label>
  }
  const attrs = (name: Field, help = false) => ({
    id:'mandate-' + name, 'aria-invalid': Boolean(errors[name]),
    'aria-describedby': [help ? 'help-' + name : '', errors[name] ? 'error-' + name : ''].filter(Boolean).join(' ') || undefined,
  })
  const input = (name: 'merchants' | 'categories' | 'requirements' | 'max_amount' | 'cumulative_limit' | 'expires_at', caption: string, help?: string) =>
    field(name, caption, <input {...attrs(name, !!help)} value={draft[name]} required={name !== 'requirements'}
      type={name === 'expires_at' ? 'datetime-local' : 'text'} inputMode={name.endsWith('amount') || name === 'cumulative_limit' ? 'decimal' : undefined}
      onChange={event => setValue(name, event.target.value)}/>, help)
  const descriptions = ['Describe intent','Review structured policy','Verify and sign','Confirmation']
  const visibleErrors = Object.entries(errors).filter((entry): entry is [string,string] => Boolean(entry[1]))
  return <>
    <PageHeader title="Intent mandates" description="Set the terms your agent can act on and sign the final contract in your browser."/>
    <StepIndicator steps={descriptions} current={step}/>
    <div className="mandate-grid">
      <Card className="wizard">
        <p className="eyebrow">{step===3 ? 'Authorisation receipt' : 'Mandate studio · Step '+(step+1)+' of 4'}</p>
        <h2 ref={heading} tabIndex={-1}>{descriptions[step]}</h2>
        {step < 3 && <form noValidate className="form-stack" onSubmit={submit}>
          {visibleErrors.length > 0 && <div className="callout danger error-summary" role="alert" tabIndex={-1} ref={errorSummary}>
            <div><strong>Check the following fields</strong><ul>{visibleErrors.map(([key,msg]) => <li key={key}><a href={'#mandate-' + key} onClick={event => {
              event.preventDefault(); document.getElementById('mandate-' + key)?.focus()
            }}>{msg}</a></li>)}</ul></div>
          </div>}
          {step === 0 && <>
            <p className="muted">Describe the purchase in your own words. In the next step, set the structured terms the verifier enforces.</p>
            {field('instruction','Shopping instruction', <textarea {...attrs('instruction')} rows={5} required maxLength={2000}
              value={draft.instruction} onChange={event=>setValue('instruction',event.target.value)}/>)}
            <button className="btn secondary" type="button" onClick={()=>setValue('instruction',example)}>Use sample intent</button>
          </>}
          {step === 1 && <>
            <p className="muted">Review these fields yourself. Product selection suggests catalogue terms and leaves your instruction intact.</p>
            {field('product_id','Expected product',<select {...attrs('product_id')} value={draft.product_id} onChange={event=>{
              const product = catalogue.find(item=>item.id === event.target.value)
              setDraft(current=>({...current, product_id:event.target.value, ...(product ? {
                merchants:product.merchant, categories:product.category, requirements:product.requirements.join(', '),
              }: {})}))
              setConfirmed(false)
            }}><option value="">Requirements only</option>{catalogue.map(product=><option value={product.id} key={product.id}>{product.title}</option>)}</select>)}
            <div className="field-grid">
              {input('max_amount','Single-payment limit (₹)')}{input('cumulative_limit','Cumulative spending limit (₹)')}
              {input('merchants','Allowed merchants','Comma-separated catalogue merchant names.')}{input('categories','Allowed categories','Comma-separated catalogue categories.')}
              {input('requirements','Required product attributes','Include every requirement, separated by commas.')}{input('expires_at','Valid until (local time)')}
              {field('consent','Consent mode',<select {...attrs('consent')} value={draft.consent} onChange={event=>setValue('consent',event.target.value === 'review' ? 'review' : 'automatic')}>
                <option value="automatic">Allow if verified</option><option value="review">Always require approval</option>
              </select>)}
              {field('missing_evidence','When evidence is missing',<select {...attrs('missing_evidence')} value={draft.missing_evidence} onChange={event=>setValue('missing_evidence',event.target.value === 'reject' ? 'reject' : 'review')}>
                <option value="review">Send for human review</option><option value="reject">Reject the proposal</option>
              </select>)}
            </div>
            <label className="check-control"><input type="checkbox" checked={draft.allow_substitutions} onChange={event=>setValue('allow_substitutions',event.target.checked)}/> Permit substitutions to be considered for verification</label>
          </>}
          {step === 2 && <>
            <p className="muted">Check the instruction and every enforceable term before signing.</p>
            <MandateSummary mandate={toPolicy('draft')} catalogue={catalogue}/>
            <div className="callout neutral"><LockKeyhole size={18} aria-hidden="true"/><p>Ed25519 signs these terms with a non-exportable key stored in this browser.</p></div>
            <label className="check-control"><input id="mandate-consent_check" type="checkbox" checked={confirmed}
              aria-invalid={Boolean(errors.consent_check)} aria-describedby={errors.consent_check ? 'mandate-consent-error' : undefined}
              onChange={event=>{setConfirmed(event.target.checked);setErrors(current=>({...current,consent_check:undefined}))}}/> I authorize the simulated spending terms above.</label>
            {errors.consent_check && <p id="mandate-consent-error" className="field-error">{errors.consent_check}</p>}
          </>}
          <div className="row-actions wizard-actions">
            {step > 0 && <button type="button" className="btn secondary" disabled={busy} onClick={()=>{setStep(step-1);setErrors({});setConfirmed(false)}}>
              <ArrowLeft size={16} aria-hidden="true"/> Back</button>}
            <button type="submit" className="btn primary" disabled={busy}>
              {step === 2 ? <><LockKeyhole size={16} aria-hidden="true"/> {busy ? 'Signing…' : 'Sign and approve mandate'}</> :
                <>{step === 0 ? 'Continue to constraints' : 'Review mandate'} <ArrowRight size={16} aria-hidden="true"/></>}
            </button>
          </div>
        </form>}
        {step === 3 && signed && <div className="form-stack">
          <div className="callout success"><Check size={20} aria-hidden="true"/><div><strong>Mandate signed</strong><p>The server verified your Ed25519 signature. It expires {instant(signed.expires_at)}.</p></div></div>
          <div><strong>Mandate ID</strong><div><CopyableIdentifier value={signed.id} name="mandate ID"/></div></div>
          <MandateSummary mandate={signed} catalogue={catalogue}/>
          <div className="row-actions"><ActionLink href={'#'+next}>{next === 'demo' ? 'Continue to demonstration' : 'Open agent workspace'}</ActionLink>
            <button className="btn secondary" onClick={()=>{setDraft(initialDraft());setSigned(undefined);setConfirmed(false);setStep(0)}}>Create another</button></div>
        </div>}
      </Card>
      <Card title="Signed mandates" note="This browser’s sandbox session">
        {mandates.length ? <ul className="compact-list mandate-list">{mandates.map(item=><li key={item.id}><div>
          <strong>{item.instruction}</strong><small>Valid until {instant(item.expires_at)}</small>
          <small>{money((item.spent ?? 0)+(item.reserved ?? 0))} of {money(item.cumulative_limit)} committed</small>
          <CopyableIdentifier value={item.id} name="mandate ID" compact/></div><StatusBadge value="SIGNED"/>
        </li>)}</ul> : <EmptyState title="No signed mandates" description="After signing, your authorization receipt will appear here." icon={FileSignature}/>}
      </Card>
    </div>
  </>
}
