import { useState } from 'react'
import { overall } from '../../docs/results/competition/metrics.json'
import { money } from './api'
import { StatusBadge } from './components'
import sample from './sample-case.json'
import { Brand, ThemeButton } from './shell'
import './landing.css'

const stages = [
  { title:'Signed intent', owner:'User', detail:'Set product requirements, allowed merchants, spending limits and an expiry. Your browser signs the mandate with Ed25519.' },
  { title:'Payment proposal', owner:'Agent', detail:'The shopper reads a synthetic catalogue and proposes an item and price. The record keeps the merchant description the shopper saw.' },
  { title:'Verification', owner:'Verifier', detail:'A separate service checks the signature, spending limits and product evidence. The calibrated model can send uncertain proposals to a reviewer.' },
  { title:'Decision record', owner:'Ledger', detail:'The ledger saves the decision, its reasons, any review and the simulated settlement in a hash chain. A saved checkpoint lets you verify the record later.' },
]

function CaseRecord() {
  const passed = Object.values(sample.checks).filter(Boolean).length
  return <figure className="case-record">
    <figcaption className="record-caption">
      <span>Payment review</span><span>Recorded sandbox case</span>
    </figcaption>
    <div className="record-columns">
      <section className="record-request">
        <h2>What the buyer asked for</h2>
        <blockquote>{sample.instruction}</blockquote>
        <dl><div><dt>Spending limit</dt><dd className="amount">{money(sample.limit)}</dd></div></dl>
      </section>
      <section className="record-proposal">
        <h2>What the agent proposed</h2>
        <p className="record-amount amount">{money(sample.amount)}</p>
        <p>{sample.product}</p>
        <p className="record-muted">{sample.merchant}</p>
      </section>
      <section className="record-outcome">
        <h2>Why it went to review</h2>
        <StatusBadge value={sample.decision}/>
        <p>The inspection record confirmed the connector and charging protocol. It could not confirm the required 65W output.</p>
      </section>
    </div>
    <div className="record-checks">
      <span>{sample.checks.signature ? 'Signature valid' : 'Signature failed'}</span>
      <span>{passed} of {Object.keys(sample.checks).length} policy checks passed</span>
    </div>
  </figure>
}

export function Landing() {
  const [stage, setStage] = useState(2)
  const measured = overall.PRAMITI

  return <div className="public-site">
    <a href="#public-main" className="skip-link" onClick={event => {
      event.preventDefault()
      document.getElementById('public-main')?.focus()
    }}>Skip to main content</a>
    <header className="public-header">
      <div className="public-wrap public-nav">
        <Brand/>
        <nav aria-label="Public pages">
          <a className="public-research-link" href="#analytics">Research</a>
          <a href="#dashboard">Workspace</a>
          <ThemeButton/>
        </nav>
      </div>
    </header>
    <main id="public-main" className="public-wrap" tabIndex={-1}>
      <section className="public-intro">
        <h1>Check what an AI agent buys.</h1>
        <div>
          <p>PRAMITI checks a proposed purchase against the buyer’s signed instructions before it can settle.</p>
          <a className="btn primary" href="#demo">Launch Live Demo</a>
          <p className="demo-note">Simulated payments only</p>
        </div>
      </section>
      <CaseRecord/>
      <section className="public-process">
        <h2>From instruction to decision</h2>
        <div className="process-layout">
          <ol className="architecture">
            {stages.map(({ title, owner }, index) => <li key={title}>
              <button type="button" aria-pressed={index === stage} aria-controls="stage-detail" onClick={() => setStage(index)}>
                <span>{owner}</span> <strong>{title}</strong>
              </button>
            </li>)}
          </ol>
          <div id="stage-detail" aria-live="polite">
            <h3>{stages[stage].title}</h3>
            <p>{stages[stage].detail}</p>
          </div>
        </div>
      </section>
      <section className="public-study">
        <div>
          <h2>Results from simulated purchases</h2>
          <p>We tested the verifier against synthetic purchase proposals. The three policies that checked product evidence had the same unsafe approval rate at matched review budgets.</p>
          <a className="public-text-link" href="#analytics">Read the evaluation and limits</a>
        </div>
        <dl>
          <div><dt>Proposals tested</dt><dd>{measured.total.toLocaleString('en-IN')}</dd></div>
          <div><dt>Unsafe proposals approved automatically by PRAMITI</dt>
            <dd>{measured.unsafe_approval_count} of {measured.nonconforming.toLocaleString('en-IN')}</dd></div>
        </dl>
      </section>
    </main>
    <footer className="public-wrap public-footer">
      <span>PRAMITI · Research prototype</span>
      <nav aria-label="Footer">
        <a href="/overview.html">Competition overview</a>
        <a href="#documentation">Technical documentation</a>
      </nav>
    </footer>
  </div>
}
