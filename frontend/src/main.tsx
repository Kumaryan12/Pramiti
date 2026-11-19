import { useEffect, useState, type FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowRight, BadgeCheck, BookOpen, Check, CircleAlert, FileSignature, Fingerprint,
  FlaskConical, Grid2X2, KeyRound, Layers3, LockKeyhole, ScanLine, ShieldCheck,
  ShoppingBag, UserRoundCheck,
} from 'lucide-react'
import { api, label, money, sign, type Evidence, type Mandate, type Payment, type Product } from './api'
import './style.css'

const pages = [
  ['dashboard', 'Dashboard', Grid2X2],
  ['mandates', 'Mandate Builder', FileSignature],
  ['agent', 'AI Shopping Agent', ShoppingBag],
  ['verification', 'Payment Verification', ScanLine],
  ['review', 'Human Review', UserRoundCheck],
  ['evidence', 'Evidence Explorer', Layers3],
] as const
type Page = typeof pages[number][0] | ''
const descriptions: Record<Exclude<Page, ''>, string> = {
  dashboard: 'Monitor authorization, payment decisions, and settlement in your sandbox.',
  mandates: 'Define what your agent can purchase, then sign your authorization in this browser.',
  agent: 'Give the shopper a signed mandate and inspect the payment it proposes.',
  verification: 'Inspect the verifier’s decision, policy checks, and settlement for each proposal.',
  review: 'Resolve exceptions that passed the hard policy checks.',
  evidence: 'Inspect the ordered record of approvals, proposals, decisions, and settlement.',
}
const currentPage = () => {
  const hash = window.location.hash.slice(1)
  return pages.some(([page]) => page === hash) ? hash as Page : ''
}

function Brand() {
  return <a className="brand" href="#" aria-label="Pramiti home"><span className="brand-mark"><ShieldCheck size={21} /></span>
    <span>PRAMITI <small>प्रमिति</small></span></a>
}

function Landing() {
  return <div className="landing">
    <header className="landing-nav"><Brand /><a className="button secondary" href="#dashboard">Open sandbox</a></header>
    <section className="hero">
      <div>
        <p className="eyebrow hero-eyebrow"><span /> GIFT FutureLab Grand Challenge</p>
        <h1>Proof of Intent<br />for <em>Agentic Finance.</em></h1>
        <p className="hero-copy">Define what software agents can spend. Verify each proposed payment against a signed mandate and send uncertain cases for human review.</p>
        <a className="button primary" href="#dashboard">Launch sandbox <ArrowRight size={17} /></a>
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="hero-grid" /><div className="ring ring-outer" /><div className="ring ring-inner" />
        <div className="proof-icon"><ShieldCheck size={70} strokeWidth={1.15} /></div>
        <div className="proof-tag proof-top"><Fingerprint size={17} /> Ed25519 authorization</div>
        <div className="proof-tag proof-bottom"><BadgeCheck size={17} /> Independent verification</div>
      </div>
    </section>
    <section className="landing-details">
      <article><KeyRound /><h2>Sign a spending mandate</h2><p>Set merchant, product, and spending limits. Your private key stays in the browser.</p></article>
      <article><ScanLine /><h2>Verify before settlement</h2><p>Send each agent proposal through policy checks and review eligible exceptions.</p></article>
      <article><BookOpen /><h2>Trace every decision</h2><p>Inspect the evidence trail and verify it against a trusted checkpoint.</p></article>
    </section>
    <footer className="landing-nav"><Brand /><span>Simulated payments only</span></footer>
  </div>
}

function Badge({ value }: { value: string }) {
  return <span className={'badge ' + value.toLowerCase()}>{label(value)}</span>
}

function PaymentTable({ rows, catalogue, onSelect }: {
  rows: Payment[]; catalogue: Product[]; onSelect: (payment: Payment) => void
}) {
  if (!rows.length) return <p className="empty">No payment proposals yet.</p>
  return <div className="table-scroll"><table><thead><tr><th>Product</th><th>Amount</th><th>Decision</th><th>Status</th></tr></thead>
    <tbody>{rows.map(payment => <tr key={payment.id}>
      <td><button className="text-action" onClick={() => onSelect(payment)}>
        {catalogue.find(product => product.id === payment.proposal.product_id)?.title ?? payment.proposal.product_id}
      </button><small>{payment.proposal.merchant}</small></td>
      <td>{money(payment.proposal.amount)}</td><td><Badge value={payment.decision} /></td><td><Badge value={payment.status} /></td>
    </tr>)}</tbody></table></div>
}

const defaultInstruction = 'Buy the Assemble 65W USB-C charger with Power Delivery.'

function MandateForm({ catalogue, onApprove, busy }: {
  catalogue: Product[]; onApprove: (mandate: Mandate) => void; busy: boolean
}) {
  const [productId, setProductId] = useState('assemble-65')
  const [instruction, setInstruction] = useState(defaultInstruction)
  const [merchants, setMerchants] = useState('Circuit House')
  const [categories, setCategories] = useState('electronics')
  const [requirements, setRequirements] = useState('65w, usb-c, pd')
  const [confirmed, setConfirmed] = useState(false)
  const [expiry] = useState(() => {
    const until = new Date(Date.now() + 24 * 3600 * 1000)
    return new Date(until.getTime() - until.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  })
  const list = (value: FormDataEntryValue | null) => String(value).split(',').map(x => x.trim()).filter(Boolean)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onApprove({
      id: crypto.randomUUID(), instruction, product_id: productId || null,
      merchants: list(data.get('merchants')), categories: list(data.get('categories')),
      requirements: list(data.get('requirements')), max_amount: Math.round(Number(data.get('max')) * 100),
      cumulative_limit: Math.round(Number(data.get('total')) * 100), allow_substitutions: data.has('substitution'),
      missing_evidence: data.get("missing_evidence") === "reject" ? "reject" : "review",
      expires_at: new Date(String(data.get('expires'))).toISOString(),
      consent: data.get('consent') === 'review' ? 'review' : 'automatic',
    })
  }
  return <form className="panel form" onChange={() => setConfirmed(false)} onSubmit={submit}>
    <h2>Spending authorization</h2>
    <label className="field">Signed shopping instruction<textarea required maxLength={2000} value={instruction} onChange={e => setInstruction(e.target.value)} /></label>
    <label className="field">Expected product<select value={productId} onChange={event => {
      const id = event.target.value
      setProductId(id)
      const product = catalogue.find(item => item.id === id)
      if (product) {
        setInstruction('Buy the ' + product.title + '.')
        setMerchants(product.merchant)
        setCategories(product.category)
        setRequirements(product.requirements.join(', '))
      }
    }}>
      <option value="">Requirements only</option>{catalogue.map(product => <option key={product.id} value={product.id}>{product.title}</option>)}
    </select></label>
    <div className="form-grid">
      <label className="field">Maximum payment (₹)<input name="max" type="number" min=".01" max="1000000" step=".01" defaultValue="3000" required /></label>
      <label className="field">Cumulative limit (₹)<input name="total" type="number" min=".01" max="1000000" step=".01" defaultValue="6000" required /></label>
      <label className="field">Approved merchants<input name="merchants" value={merchants} onChange={e => setMerchants(e.target.value)} required /></label>
      <label className="field">Approved categories<input name="categories" value={categories} onChange={e => setCategories(e.target.value)} required /></label>
      <label className="field">Required product attributes<input name="requirements" value={requirements} onChange={e => setRequirements(e.target.value)} placeholder="Comma-separated catalogue attributes" /></label>
      <label className="field">Expires (local time)<input name="expires" type="datetime-local" defaultValue={expiry} required /></label>
    </div>
    <label className="field">Consent mode<select name="consent"><option value="automatic">Allow if verified</option><option value="review">Always require human approval</option></select></label>
    <label className="field">When independent evidence is missing<select name="missing_evidence">
      <option value="review">Send for human review</option><option value="reject">Reject the proposal</option>
    </select></label>
    <p className="muted">Include every required attribute in the signed product fields. Merchant descriptions alone cannot verify compatibility.</p>
    <label className="checkbox"><input name="substitution" type="checkbox" defaultChecked /> Permit substitutions to be considered for verification</label>
    <label className="checkbox" onChange={e => e.stopPropagation()}><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} required /> I authorize the simulated spending terms above.</label>
    <button className="button primary" disabled={busy || !confirmed}><LockKeyhole size={16} /> Sign and approve mandate</button>
  </form>
}

const scenarios = [
  { key: 'legitimate', title: 'Legitimate payment', detail: 'The shopper proposes the authorized 65W charger.' },
  { key: 'over_budget', title: 'Policy violation', detail: 'The shopper selects a ₹4,899 charger above the default limit.' },
  { key: 'substitution', title: 'Suspicious substitution', detail: 'A merchant compatibility claim steers the shopper toward a cheaper charger.' },
]

function App() {
  const [page, setPage] = useState<Page>(currentPage)
  const [catalogue, setCatalogue] = useState<Product[]>([])
  const [mandates, setMandates] = useState<Mandate[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [evidence, setEvidence] = useState<Evidence>()
  const [mandateId, setMandateId] = useState('')
  const [selected, setSelected] = useState<Payment>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [llmEnabled, setLlmEnabled] = useState(false)
  const [mode, setMode] = useState('scripted')
  const [token, setToken] = useState('')
  const [checkpoint, setCheckpoint] = useState('')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [ready, setReady] = useState(false)

  async function refresh() {
    const [policies, transactions] = await Promise.all([api<Mandate[]>('/mandates'), api<Payment[]>('/payments')])
    setMandates(policies)
    setPayments(transactions)
    setMandateId(existing => existing || policies.at(-1)?.id || '')
  }

  useEffect(() => {
    const handler = () => { setPage(currentPage()); setError(''); setNotice('') }
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  useEffect(() => {
    if (!page || ready) return
    // The initial cookie must be present before protected requests begin.
    api<{ llm_enabled: boolean }>('/session', {}).then(async session => {
      setLlmEnabled(session.llm_enabled)
      await Promise.all([refresh(), api<Product[]>('/catalogue').then(setCatalogue)])
      setReady(true)
    }).catch(cause => setError(String(cause.message ?? cause)))
  }, [page, ready])

  useEffect(() => {
    if (page === 'evidence' && ready) {
      api<Evidence>('/evidence').then(setEvidence).catch(cause => setError(cause.message))
    }
  }, [page, ready])

  async function work(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    setNotice('')
    try { await action() } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
    finally { setBusy(false) }
  }

  const go = (target: Exclude<Page, ''>) => { window.location.hash = target }
  const selectPayment = (payment: Payment) => { setSelected(payment); go('verification') }
  const payment = selected ? payments.find(item => item.id === selected.id) ?? selected : payments[0]
  const mandate = mandates.find(item => item.id === mandateId)
  const pending = payments.filter(item => item.status === 'PENDING')
  const total = payments.filter(item => item.status === 'SETTLED').reduce((sum, item) => sum + item.proposal.amount, 0)

  function run(scenario?: string) {
    void work(async () => {
      const result = await api<Payment>('/agent/runs', { mandate_id: mandateId, mode: scenario ? 'scripted' : mode, scenario },
        !scenario && mode === 'llm' ? { 'X-LLM-Token': token } : undefined)
      setSelected(result)
      await refresh()
      go('verification')
    })
  }

  function review(item: Payment, decision: 'approve' | 'reject') {
    void work(async () => {
      const result = await api<Payment>('/payments/' + item.id + '/review', { decision, note: notes[item.id] ?? '' })
      setSelected(result)
      setNotes(previous => ({ ...previous, [item.id]: '' }))
      await refresh()
      go('verification')
    })
  }

  if (!page) return <Landing />
  const title = pages.find(([id]) => id === page)?.[1]
  return <div className="app-shell">
    <aside className="sidebar">
      <Brand />
      <p className="sidebar-label">WORKSPACE</p>
      <nav aria-label="Workspace">{pages.map(([id, name, Icon]) =>
        <a key={id} href={'#' + id} aria-current={page === id ? 'page' : undefined}><Icon size={18} />{name}</a>)}</nav>
      <div className="sidebar-bottom"><FlaskConical size={16} /> Synthetic payment sandbox</div>
    </aside>
    <main className="workspace">
      <header className="workspace-header"><span>Workspace <b>/</b> {title}</span><span className="system-label"><span /> {ready ? 'Sandbox connected' : 'Sandbox session'}</span></header>
      <div className="content">
        <div className="page-heading"><h1>{title}</h1><p>{descriptions[page]}</p></div>
        {error && <div role="alert" className="message error"><CircleAlert size={18} />{error}</div>}
        {notice && <div role="status" className="message"><Check size={18} />{notice}</div>}
        {page === 'dashboard' && <>
          <section className="dashboard-hero">
            <div><p className="eyebrow">PROOF OF INTENT</p><h2>Authorize before agents spend.</h2><p>Create a signed mandate, run an agent, and trace its payment decision.</p>
              <a className="button primary" href="#mandates">Create a mandate <ArrowRight size={16} /></a></div>
            <div className="dashboard-shield"><ShieldCheck size={106} strokeWidth={1.1} /></div>
          </section>
          <div className="metrics">
            <article className="panel"><FileSignature /><span>Signed mandates</span><strong>{mandates.length}</strong></article>
            <article className="panel"><UserRoundCheck /><span>Pending review</span><strong>{pending.length}</strong></article>
            <article className="panel"><BadgeCheck /><span>Simulated settlement</span><strong>{money(total)}</strong></article>
          </div>
          <section className="panel"><h2>Recent proposals</h2><PaymentTable rows={payments.slice(0, 5)} catalogue={catalogue} onSelect={selectPayment} /></section>
        </>}
        {page === 'mandates' && <>
          <MandateForm catalogue={catalogue} busy={busy || !ready} onApprove={policy => void work(async () => {
            await api<Mandate>('/mandates', await sign(policy))
            setMandateId(policy.id)
            await refresh()
            go('agent')
          })} />
          <section className="panel"><h2>Signed mandates</h2>
            {mandates.length === 0 && <p className="empty">Your signed mandates will appear here.</p>}
            {mandates.map(item => <div className="list-item" key={item.id}><div><strong>{item.instruction}</strong><small>Expires {new Date(item.expires_at).toLocaleString()}</small></div>
              <span>{money((item.spent ?? 0) + (item.reserved ?? 0))} of {money(item.cumulative_limit)} committed</span></div>)}
          </section>
        </>}
        {page === 'agent' && <>
          <section className="panel form"><h2>Run shopper</h2>
            {mandates.length === 0 ? <a className="button secondary" href="#mandates">Create a signed mandate</a> :
              <label className="field">Signed mandate<select value={mandateId} onChange={event => setMandateId(event.target.value)}>
                {mandates.map(item => <option value={item.id} key={item.id}>{item.instruction}</option>)}
              </select></label>}
            <div className="form-grid">
              <label className="field">Agent mode<select value={mode} onChange={event => setMode(event.target.value)}>
                <option value="scripted">Scripted</option><option value="llm" disabled={!llmEnabled}>LLM {llmEnabled ? '' : '(disabled)'}</option>
              </select></label>
              {mode === 'llm' && <label className="field">LLM operator token<input type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)} /></label>}
            </div>
            {mandate && <p className="muted">Single-payment limit {money(mandate.max_amount)}. Cumulative limit {money(mandate.cumulative_limit)}.</p>}
            <button className="button primary" onClick={() => run()} disabled={busy || !mandate || (mode === 'llm' && !token)}><ShoppingBag size={16} /> Propose payment</button>
          </section>
          <section className="panel"><h2>Demonstration scenarios</h2><p className="muted">Use the default 65W charger mandate to reproduce all three decisions. Each scenario uses the scripted agent.</p>
            <div className="scenario-grid">{scenarios.map(scenario => <button className="scenario" key={scenario.key} disabled={busy || !mandate}
              onClick={() => run(scenario.key)}><strong>{scenario.title}</strong><span>{scenario.detail}</span><ArrowRight size={16} /></button>)}</div>
          </section>
          <section className="panel"><h2>Synthetic catalogue</h2><div className="catalogue-grid">{catalogue.map(product =>
            <article className="product" key={product.id}><div><span className="eyebrow">{product.merchant}</span><strong>{money(product.amount)}</strong></div>
              <h3>{product.title}</h3><p>{product.description}</p></article>)}</div></section>
        </>}
        {page === 'verification' && <>
          {payment && <section className="panel">
            <div className="section-line"><h2>{catalogue.find(item => item.id === payment.proposal.product_id)?.title ?? payment.proposal.product_id}</h2><Badge value={payment.decision} /></div>
            <p className="muted">{money(payment.proposal.amount)} · {payment.proposal.merchant} · {payment.source} proposal</p>
            <p>{payment.rationale}</p>
            <div className="reason-list">{payment.reasons.map(reason => <p key={reason}>{label(reason)}</p>)}</div>
            <div className="check-grid">{Object.entries(payment.checks).map(([name, passed]) => <div key={name} className={passed ? 'passed' : 'failed'}>
              {passed ? <Check size={17} /> : <CircleAlert size={17} />}{label(name)}</div>)}</div>
            {payment.compatibility && <section className="reason-list" aria-label="Product compatibility evidence">
              <h3>Product evidence · {label(payment.compatibility.status)}</h3>
              {payment.compatibility.confirmed.length > 0 && <p>Independently recorded · {payment.compatibility.confirmed.join(', ')}</p>}
              {payment.compatibility.contradictions.length > 0 && <p>Verified conflicts · {payment.compatibility.contradictions.join(', ')}</p>}
              {payment.compatibility.missing.length > 0 && <p>Unverified requirements · {payment.compatibility.missing.join(', ')}</p>}
              {payment.compatibility.merchant_only.length > 0 && <p>Merchant claims only · {payment.compatibility.merchant_only.join(', ')}</p>}
              {payment.compatibility.evidence_reference && <p className="muted">Synthetic evidence reference · {payment.compatibility.evidence_reference}</p>}
            </section>}
            {payment.semantic && <p className="muted">Prediction set {'{'}{payment.semantic.prediction_set.join(', ')}{'}'}</p>}
            <div className="section-line settlement"><span><Badge value={payment.status} /> {payment.settlement?.reference}</span>
              {payment.status === 'PENDING' && <a className="button secondary" href="#review">Open human review</a>}</div>
            {payment.review && <p className="muted">Review {payment.review.approved ? 'approved' : 'declined'}{payment.review.note && ' · ' + payment.review.note}
              {payment.review.failed_checks.length > 0 && ' · Failed checks: ' + payment.review.failed_checks.map(label).join(', ')}</p>}
          </section>}
          <section className="panel"><h2>Proposal history</h2><PaymentTable rows={payments} catalogue={catalogue} onSelect={selectPayment} /></section>
        </>}
        {page === 'review' && <section className="panel">
          <h2>Review queue</h2>
          {!pending.length && <p className="empty">No payments awaiting review.</p>}
          {pending.map(item => <article key={item.id} className="review-item">
            <div className="section-line"><h3>{catalogue.find(product => product.id === item.proposal.product_id)?.title ?? item.proposal.product_id}</h3><Badge value={item.status} /></div>
            <p className="muted">{money(item.proposal.amount)} · {item.proposal.merchant}</p>
            <p>Signed instruction: {mandates.find(policy => policy.id === item.proposal.mandate_id)?.instruction}</p>
            <p>{item.reasons.join(' · ')}</p>
            <label className="field">Reviewer note {item.compatibility?.missing.length ? '(required to approve)' : '(optional)'}<input maxLength={1000} value={notes[item.id] ?? ''} onChange={e => setNotes(previous => ({ ...previous, [item.id]: e.target.value }))} /></label>
            <div className="actions"><button className="button primary" disabled={busy || Boolean(item.compatibility?.missing.length && !notes[item.id]?.trim())} onClick={() => review(item, 'approve')}>Approve simulated settlement</button>
              <button className="button secondary" disabled={busy} onClick={() => review(item, 'reject')}>Reject</button></div>
          </article>)}
        </section>}
        {page === 'evidence' && <section className="panel form">
          <div className="section-line"><h2>SHA-256 chain</h2>{evidence && <Badge value={evidence.valid ? 'VALID' : 'INVALID'} />}</div>
          <p className="muted">Hash chaining proves record integrity relative to a trusted checkpoint. It cannot establish whether an original input was true.</p>
          {evidence && <p className="digest"><strong>Head · {evidence.count} events</strong><br />{evidence.head}</p>}
          <form className="checkpoint" onSubmit={event => {
            event.preventDefault()
            void work(async () => {
              const result = await api<Evidence>('/evidence' + (checkpoint ? '?checkpoint=' + encodeURIComponent(checkpoint) : ''))
              setEvidence(result)
              setNotice(result.valid ? (result.checkpoint_found === null ? 'Evidence chain verified.'
                : result.checkpoint_found ? 'Evidence chain and checkpoint verified.' : 'Evidence chain verified. The checkpoint is absent.')
                : 'Evidence chain integrity check failed.')
            })
          }}><label className="field">Trusted checkpoint (optional)<input value={checkpoint} onChange={e => setCheckpoint(e.target.value.trim())}
              pattern="[0-9a-f]{64}" placeholder="64-character SHA-256 digest" /></label>
            <button className="button secondary" disabled={busy || !ready}><ShieldCheck size={17} /> Verify chain</button></form>
          {[...(evidence?.events ?? [])].reverse().map(event => <details key={event.position} className="event">
            <summary><strong>{label(event.action)}</strong><span>{new Date(event.at).toLocaleString()} · {event.digest.slice(0, 10)}</span></summary>
            <pre>{JSON.stringify(event, null, 2)}</pre>
          </details>)}
          {evidence?.count === 0 && <p className="empty">The chain will populate as you approve mandates and submit proposals.</p>}
        </section>}
      </div>
    </main>
  </div>
}

createRoot(document.getElementById('root')!).render(<App />)
