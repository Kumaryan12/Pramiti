import { useState } from 'react'
import { Check, ChevronRight, CircleCheck, FileKey2, Fingerprint, GitBranch, Layers3, ScanLine, ShieldCheck, ShoppingBag } from 'lucide-react'
import { overall } from '../../docs/results/competition/metrics.json'
import { money } from './api'
import { StatusBadge } from './components'
import sample from './sample-case.json'
import { Brand, ThemeButton } from './shell'
import './landing.css'

const stages = [
  {title:'Signed intent', icon:FileKey2, owner:'User', detail:'The user sets product requirements, permitted merchants, spending caps and expiry. Their browser signs the reviewed terms with Ed25519.'},
  {title:'Payment proposal', icon:ShoppingBag, owner:'Agent', detail:'The shopper reads the synthetic catalogue and proposes a product and price. Merchant-supplied descriptions stay attached to the observation.'},
  {title:'Verification', icon:ScanLine, owner:'Verifier', detail:'The firewall checks the signature, spending limits and product evidence. Eligible proposals can also receive a calibrated prediction set.'},
  {title:'Decision record', icon:Layers3, owner:'Ledger', detail:'Allow, review or reject is recorded with its reasons. Human decisions and simulated settlements append further events to the hash chain.'},
]

function Engraving() {
  return <svg className="engraving" viewBox="0 0 1440 650" preserveAspectRatio="none" aria-hidden="true">
    {Array.from({length:68},(_,i)=><path key={i} d={`M -100 ${450+i*4} C 210 ${670+i*3}, 375 ${360+i*6}, 652 ${457+i*2} S 997 ${809-i*6}, 1220 ${369-i*3} S 1510 ${147+i*5}, 1580 ${135+i*6}`}/>)}
  </svg>
}

function CasePreview() {
  return <figure className="case-slip">
    <figcaption><span><Fingerprint size={18}/> Verification record</span><small>Recorded example</small></figcaption>
    <div className="slip-body">
      <p className="slip-label">Proposed payment</p>
      <div className="slip-amount">{money(sample.amount)} <span>INR</span></div>
      <p className="slip-merchant">{sample.product} · {sample.merchant}</p>
      <ol className="slip-trace">
        <li><FileKey2/><div><strong>User-approved intent</strong><small>65W USB-C Power Delivery</small></div></li>
        <li><ShoppingBag/><div><strong>Agent proposal</strong><small>20W substitute within the {money(sample.limit)} limit</small></div></li>
        <li><ScanLine/><div><strong>Independent verification</strong><small>Required wattage lacks independent evidence</small></div></li>
      </ol>
    </div>
    <div className="slip-result"><span>Recorded decision</span><StatusBadge value={sample.decision}/></div>
  </figure>
}

export function Landing() {
  const [stage,setStage]=useState(2)
  const measured=overall.PRAMITI
  return <div className="public-site edition">
    <a href="#public-main" className="skip-link" onClick={e=>{e.preventDefault();document.getElementById('public-main')?.focus()}}>Skip to main content</a>
    <header className="public-header"><div className="wrap public-nav"><Brand/><nav aria-label="Public pages">
      <a href="/overview.html">Project overview</a><a href="#analytics">Research</a><ThemeButton/><a className="btn open-work" href="#dashboard">Open workspace</a>
    </nav></div></header>
    <main id="public-main" tabIndex={-1}>
      <section className="cover"><Engraving/><div className="wrap cover-inner">
        <div className="cover-copy"><p className="kicker">Agentic finance · Financial assurance</p>
          <h1>Autonomous Payments.<br/><em>Verifiable Intent.</em></h1>
          <p className="cover-description">PRAMITI independently verifies whether AI-initiated transactions reflect user-approved intentions, escalates uncertain decisions, and preserves tamper-evident records.</p>
          <div className="cover-actions"><a className="btn mint" href="#demo">Launch Live Demo</a><a className="btn glass" href="#analytics">Explore the Research</a></div>
          <p className="cover-foot"><span/> Research Prototype · Simulated Payments</p>
        </div>
        <CasePreview/>
      </div></section>
      <section className="sheet gap-section"><div className="wrap editorial-split">
        <div><p className="kicker">The authorisation gap</p><h2>The gap between permission and intention.</h2></div>
        <div className="comparison"><div><CircleCheck/><div><h3>Within budget</h3><p>The proposed charger costs {money(sample.amount)}. The signed policy permits up to {money(sample.limit)}.</p></div></div>
          <div><GitBranch/><div><h3>Outside the intended specification</h3><p>The user asked for 65W Power Delivery. The substitute’s inspection record confirms the connector and protocol only.</p></div></div></div>
      </div></section>
      <section className="sheet"><div className="wrap"><p className="kicker">Decision architecture</p><h2>How PRAMITI works.</h2>
        <ol className="architecture">{stages.map(({title,icon:Icon,owner},i)=><li key={title}><button type="button" aria-pressed={i===stage} aria-controls="stage-detail" onClick={()=>setStage(i)}>
          <Icon size={21}/><span><small>{owner}</small><strong>{title}</strong></span></button>{i<stages.length-1 && <ChevronRight aria-hidden="true"/>}</li>)}</ol>
        <div id="stage-detail" aria-live="polite"><strong>{stages[stage].title}</strong><p>{stages[stage].detail}</p></div>
      </div></section>
      <section className="sheet trust-sheet"><div className="wrap"><h2>Three layers of trust.</h2><div className="trust-columns">
        <article><FileKey2/><h3>Signed Intent</h3><p>The user reviews the exact instruction, limits and expiry before signing in their browser.</p></article>
        <article><ShieldCheck/><h3>Independent Verification</h3><p>Server-side rules compare the proposal with the mandate and independently recorded product attributes.</p></article>
        <article><Layers3/><h3>Verifiable Evidence</h3><p>Linked events preserve the observations, decision and settlement. A saved checkpoint lets an investigator verify the history.</p></article>
      </div></div></section>
      <section className="sheet"><div className="wrap editorial-split"><div><p className="kicker">Recorded substitution case</p><h2>Inside the verification engine.</h2><p>All hard checks passed in this run. The missing product evidence still required a human decision.</p><a className="inline-link" href="#demo">Open the live demo</a></div>
        <div className="engine-panel"><header><ScanLine size={18}/><h3>Decision trace</h3></header><dl>
          <div><dt>Signed mandate</dt><dd><Check size={14}/> {sample.checks.signature ? 'Signature valid' : 'Signature failed'}</dd></div>
          <div><dt>Policy firewall</dt><dd>{Object.values(sample.checks).filter(Boolean).length}/{Object.keys(sample.checks).length} checks passed</dd></div>
          <div><dt>Compatibility</dt><dd>{sample.compatibility.replaceAll('_',' ')}</dd></div>
          <div><dt>Decision</dt><dd><StatusBadge value={sample.decision}/></dd></div>
        </dl><p>{sample.reasons.join(' · ')}</p></div>
      </div></section>
      <section className="sheet study"><div className="wrap editorial-split"><div><p className="kicker">Synthetic evaluation</p><h2>Research-backed assurance.</h2><p>Class-conditional calibration assumes exchangeability within each label. The measured results depend on synthetic inspection records.</p><a className="inline-link" href="#analytics">Explore the Safety–Autonomy Frontier</a></div>
        <div className="study-numbers"><div><strong>{measured.total.toLocaleString('en-IN')}</strong><span>synthetic test proposals</span></div><div><strong>{measured.unsafe_approval_count} / {measured.nonconforming.toLocaleString('en-IN')}</strong><span>unsafe cases auto-approved by the calibrated gate</span></div><p>The three evidence-aware policies tied at the measured matched review budgets.</p></div>
      </div></section>
      <section className="sheet closing"><div className="wrap"><div><p className="kicker">Proof of Intent for Agentic Finance</p><h2>Experience PRAMITI.</h2><p>Verify Intent. Control Risk. Preserve Evidence.</p></div><a className="btn mint" href="#demo">Launch Live Demo</a></div></section>
    </main>
    <footer className="edition-footer wrap"><Brand/><a href="/overview.html">Project overview</a><a href="#documentation">Technical documentation</a></footer>
  </div>
}
