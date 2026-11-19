import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Activity, BookOpen, FileSignature, FlaskConical, Grid2X2, Layers3, Play, ScanLine, ShieldCheck, ShoppingBag, UserRoundCheck } from 'lucide-react'
import { api, sign, type Evidence, type Mandate, type Payment, type Product } from './api'
import { ErrorState, LoadingSkeleton } from './components'
import { Mandates } from './mandates'
import { AttackLab, Documentation, EvidenceExplorer, Ledger } from './investigation'
import { Landing } from './landing'
import { Demo } from './demo'
import { Dashboard, type Scenario } from './overview'
import { Agent, Reviews, Transactions } from './payments'
import { AppShell, type NavGroup } from './shell'
import './style.css'
import './theme.css'
import './institution.css'
import './product.css'
import './workflow.css'

const Analytics = lazy(()=>import('./analytics'))

const groups: NavGroup[] = [
  { title: 'Overview', items: [
    {id:'dashboard',title:'Command Centre',icon:Grid2X2}, {id:'demo',title:'Live Demo',icon:Play},
  ] },
  { title: 'Payment assurance', items: [
    {id:'mandates',title:'Intent mandates',icon:FileSignature}, {id:'agent',title:'AI Agent',icon:ShoppingBag},
    {id:'verification',title:'Transactions',icon:ScanLine}, {id:'review',title:'Human review',icon:UserRoundCheck},
  ] },
  {title:'Investigation',items:[{id:'evidence',title:'Evidence explorer',icon:Layers3},{id:'ledger',title:'Ledger Integrity',icon:ShieldCheck}]},
  {title:'Research',items:[{id:'lab',title:'Attack laboratory',icon:FlaskConical},{id:'analytics',title:'Evaluation analytics',icon:Activity}]},
  {title:'System',items:[{id:'documentation',title:'Technical Documentation',icon:BookOpen}]},
]
const aliases: Record<string,string> = {transactions:'verification','intent-mandates':'mandates','human-review':'review'}
const routeNames = new Set(groups.flatMap(group=>group.items.map(item=>item.id)))

function readRoute() {
  const [raw, query] = location.hash.slice(1).split('?')
  const id = aliases[raw] ?? raw
  return {id:routeNames.has(id) ? id : '', params:new URLSearchParams(query)}
}
function navigate(id: string, tx?: string) {
  location.hash = id + (tx ? '?tx=' + encodeURIComponent(tx) : '')
}
function savedTheme() {
  try { return localStorage.getItem('pramiti-theme') === 'dark' ? 'dark' : 'light' }
  catch { return 'light' }
}
document.documentElement.dataset.theme = savedTheme()
const errorMessage = (error:unknown) => error instanceof Error ? error.message : String(error)

function App() {
  const [route,setRoute] = useState(readRoute)
  const [session, setSession] = useState<'idle'|'loading'|'ready'|'error'>('idle')
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [catalogue,setCatalogue] = useState<Product[]>([])
  const [mandates,setMandates] = useState<Mandate[]>([])
  const [payments,setPayments] = useState<Payment[]>([])
  const [evidence,setEvidence] = useState<Evidence>()
  const [refreshed,setRefreshed] = useState<string>()
  const [mandateId,setMandateId] = useState('')
  const [agentPaymentId,setAgentPaymentId] = useState('')
  const [llmEnabled,setLlmEnabled] = useState(false)
  const pendingAction = useRef(false)
  const connecting = useRef(false)

  useEffect(()=>{
    const change = () => {
      setRoute(readRoute())
      setError('')
    }
    window.addEventListener('hashchange',change)
    return ()=>window.removeEventListener('hashchange',change)
  },[])
  useEffect(()=>{
    const title = groups.flatMap(group=>group.items).find(item=>item.id===route.id)?.title
    document.title = title ? title + ' · PRAMITI' : 'PRAMITI · Proof of Intent for Agentic Finance'
    if (route.params.has('tx')) window.scrollTo(0,0)
  },[route])

  async function refresh() {
    const [policies,records,ledger] = await Promise.all([api<Mandate[]>('/mandates'),api<Payment[]>('/payments'),api<Evidence>('/evidence')])
    setMandates(policies)
    setPayments(records)
    setEvidence(ledger)
    setMandateId(current=>policies.some(item=>item.id===current) ? current : policies.at(-1)?.id ?? '')
    setRefreshed(new Date().toISOString())
  }

  async function connect() {
    if (connecting.current) return
    connecting.current = true
    setSession('loading')
    setError('')
    try {
      const connection = await api<{llm_enabled:boolean}>('/session',{})
      setLlmEnabled(connection.llm_enabled)
      await Promise.all([refresh(),api<Product[]>('/catalogue').then(setCatalogue)])
      setSession('ready')
    } catch (cause) {
      setError(errorMessage(cause))
      setSession('error')
    } finally { connecting.current = false }
  }

  useEffect(()=>{
    if (route.id && route.id!=='documentation' && route.id!=='analytics' && session==='idle') void connect()
  },[route.id,session])

  async function perform<T>(action:()=>Promise<T>) {
    if (pendingAction.current || session!=='ready') return
    pendingAction.current = true
    setBusy(true)
    setError('')
    try { return await action() }
    catch(cause) { setError(errorMessage(cause)) }
    finally { pendingAction.current = false; setBusy(false) }
  }
  async function refreshAfterSave() {
    try { await refresh() }
    catch(cause) { setError('The action was recorded. Session refresh failed. ' + errorMessage(cause)) }
  }
  function savePayment(result: Payment) {
    setPayments(previous=>[result,...previous.filter(item=>item.id!==result.id)])
  }
  function run(mode:'scripted'|'llm', token='', scenario?:Scenario, keepContext=false) {
    return perform(async()=>{
      const result = await api<Payment>('/agent/runs',{mandate_id:mandateId,mode,scenario},
        mode==='llm' ? {'X-LLM-Token':token} : undefined)
      savePayment(result)
      setAgentPaymentId(result.id)
      await refreshAfterSave()
      if (scenario && !keepContext) navigate('demo',result.id)
      return result
    })
  }
  function decide(id:string,decision:'approve'|'reject',note:string) {
    return perform(async()=>{
      const result = await api<Payment>('/payments/' + encodeURIComponent(id) + '/review',{decision,note})
      savePayment(result)
      await refreshAfterSave()
      return result
    })
  }
  const transactionId = route.params.get('tx') ?? undefined
  const payment = transactionId ? payments.find(item=>item.id===transactionId) : payments[0]
  const latestAgentPayment = payments.find(item=>item.id===agentPaymentId) ?? payments.find(item=>item.source==='scripted' || item.source==='llm')
  useEffect(()=>{
    if (route.id==='demo' && transactionId && payment) setMandateId(payment.proposal.mandate_id)
  },[route.id,transactionId,payment?.id])
  const offlinePage = route.id==='documentation' || route.id==='analytics'
  if (!route.id) return <Landing/>

  return <AppShell groups={groups} page={route.id} status={session==='ready' ? 'Sandbox connected' : session==='error' ? 'Sandbox unavailable' : 'Simulated payments'}>
    <div className="product-content">
      {!offlinePage && error && <ErrorState message={error} retry={session==='error' ? ()=>void connect() : undefined}/>}
      {!offlinePage && (session==='idle' || session==='loading') && <LoadingSkeleton label="Connecting to the synthetic sandbox…"/>}
      {session==='ready' && route.id==='dashboard' && <Dashboard payments={payments} catalogue={catalogue} evidence={evidence} refreshed={refreshed}
        busy={busy} onRefresh={()=>void perform(refresh)}/>}
      {session==='ready' && route.id==='demo' && <Demo mandates={mandates} mandateId={mandateId} setMandateId={id=>{setMandateId(id);navigate('demo')}}
        catalogue={catalogue} evidence={evidence} payment={transactionId ? payment : payments.find(p=>p.source==='scripted' && p.proposal.mandate_id===mandateId)}
        busy={busy} run={scenario=>void run('scripted','',scenario)}/>}
      {session==='ready' && route.id==='mandates' && <Mandates catalogue={catalogue} mandates={mandates} busy={busy}
        next={route.params.get('next')==='demo' ? 'demo' : 'agent'}
        onSign={policy=>perform(async()=>{
          const approved = await api<Mandate>('/mandates',await sign(policy))
          setMandateId(approved.id)
          setMandates(previous=>[...previous,approved])
          await refreshAfterSave()
          return approved
        })}/>}
      {session==='ready' && route.id==='agent' && <Agent mandates={mandates} mandateId={mandateId} setMandateId={setMandateId}
        catalogue={catalogue} payment={latestAgentPayment} evidence={evidence} busy={busy} llmEnabled={llmEnabled}
        onRun={(mode,token)=>void run(mode,token)}/>}
      {session==='ready' && route.id==='verification' && <>
        {transactionId && !payment && <ErrorState message="This transaction is unavailable in your browser session."/>}
        <Transactions payment={payment} payments={payments} catalogue={catalogue} mandates={mandates} evidence={evidence}/>
      </>}
      {session==='ready' && route.id==='review' && <Reviews key={transactionId} payments={payments} catalogue={catalogue} mandates={mandates}
        selectedId={transactionId} busy={busy} onReview={decide}/>}
      {session==='ready' && route.id==='evidence' && <EvidenceExplorer key={transactionId} evidence={evidence}
        payments={payments} catalogue={catalogue} initialId={transactionId}/>}
      {session==='ready' && route.id==='ledger' && <Ledger evidence={evidence} busy={busy}
        verify={checkpoint=>perform(()=>api<Evidence>('/evidence'+(checkpoint ? '?checkpoint='+encodeURIComponent(checkpoint) : '')))}/>}
      {session==='ready' && route.id==='lab' && <AttackLab mandates={mandates} mandateId={mandateId} setMandateId={setMandateId}
        run={scenario=>void run('scripted','',scenario,true)} busy={busy} payments={payments} evidence={evidence}/>}
      {route.id==='analytics' && <Suspense fallback={<LoadingSkeleton label="Loading executed research results…"/>}>
        <Analytics key={route.params.get('family')} initialFamily={route.params.get('family') ?? undefined}/></Suspense>}
      {route.id==='documentation' && <Documentation/>}
    </div>
  </AppShell>
}

createRoot(document.getElementById('root')!).render(<App />)
