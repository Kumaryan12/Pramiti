import { ClipboardList, GitBranch, Search, ShieldCheck, ShoppingBag, UserRoundCheck } from 'lucide-react'
import { money, type AgentStep } from './api'
import { instant, Timeline } from './components'

export const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

export function agentSteps(value: unknown): AgentStep[] {
  if (!Array.isArray(value)) return []
  return value.map(asRecord).flatMap(step => typeof step.name === 'string' && typeof step.at === 'string'
    ? [{ name: step.name, at: step.at, arguments: asRecord(step.arguments), result: asRecord(step.result) }]
    : [])
}

const tools = {
  search_catalogue: { title: 'Searched the catalogue', icon: Search },
  compare_products: { title: 'Compared products', icon: GitBranch },
  check_product_evidence: { title: 'Checked product evidence', icon: ShieldCheck },
  propose_catalog_purchase: { title: 'Proposed a purchase', icon: ShoppingBag },
  ask_buyer: { title: 'Asked the buyer', icon: UserRoundCheck },
}

const text = (value: unknown) => typeof value === 'string' ? value : undefined
const list = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

export function AgentTrace({ steps }: { steps: AgentStep[] }) {
  return <Timeline entries={steps.map((step, index) => {
    const tool = tools[step.name as keyof typeof tools] ?? { title: step.name, icon: ClipboardList }
    const products = Array.isArray(step.result.products) ? step.result.products.map(asRecord) : []
    const compatibility = asRecord(step.result.compatibility)
    const proposed = asRecord(step.result.product)
    const error = text(step.result.error)
    const query = text(step.arguments.query)
    return {
      id: String(index), title: error && step.name === 'propose_catalog_purchase' ? 'Proposal blocked during shopping' : tool.title,
      icon: tool.icon, meta: instant(step.at),
      body: error ? <p>{error}</p> : <>
        {step.name === 'search_catalogue' && <p>{query ? 'Search: ' + query : 'Browsed the catalogue'} · {products.length} matches</p>}
        {!!products.length && <details className="record-disclosure" open={step.name === 'compare_products'}>
          <summary>Product listings ({products.length})</summary>
          <ul className="agent-listings">{products.map((product, position) => <li key={text(product.id) ?? position}>
            <div><strong>{text(product.title) ?? text(product.id)}</strong>
              {typeof product.amount === 'number' && <span className="amount">{money(product.amount)}</span>}</div>
            <p>{text(product.merchant)} · {list(product.requirements).join(', ')}</p>
          </li>)}</ul>
        </details>}
        {step.name === 'check_product_evidence' && <dl className="detail-list agent-specs">
          <div><dt>Product</dt><dd><code>{text(step.result.product_id)}</code></dd></div>
          <div><dt>Confirmed</dt><dd>{list(compatibility.confirmed).join(', ') || 'None'}</dd></div>
          {!!list(compatibility.missing).length && <div><dt>Missing evidence</dt><dd>{list(compatibility.missing).join(', ')}</dd></div>}
          {!!list(compatibility.contradictions).length && <div><dt>Conflicts</dt><dd>{list(compatibility.contradictions).join(', ')}</dd></div>}
          {text(compatibility.evidence_reference) && <div><dt>Inspection record</dt><dd><code>{text(compatibility.evidence_reference)}</code></dd></div>}
        </dl>}
        {step.name === 'propose_catalog_purchase' && <>
          <p><strong>{text(proposed.title) ?? text(step.result.product_id)}</strong>
            {typeof proposed.amount === 'number' && <> · <span className="amount">{money(proposed.amount)}</span></>}</p>
          <p>{text(step.arguments.rationale)}</p>
        </>}
        {step.name === 'ask_buyer' && <p>{text(step.arguments.question)}</p>}
      </>,
    }
  })}/>
}
