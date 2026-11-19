import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import {
  AlertCircle, ArrowRight, Check, ChevronRight, Circle, Clock3, Copy, FileSearch, ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { label, money, type Payment, type Product } from './api'

const statusMap: Record<string, [string, string]> = {
  ALLOW: ['Approved', 'success'], ESCALATE: ['Human review', 'warning'], REJECT: ['Rejected', 'danger'],
  SETTLED: ['Settled', 'success'], PENDING: ['Pending', 'warning'], REJECTED: ['Rejected', 'danger'],
  VERIFIED: ['Chain verified', 'success'], INVALID: ['Chain invalid', 'danger'],
  UNKNOWN: ['Unavailable', 'neutral'], UNSIGNED: ['Unsigned draft', 'neutral'], SIGNED: ['Signed', 'success'],
}
export function StatusBadge({ value, text }: { value: string; text?: string }) {
  const [title, tone] = statusMap[value] ?? [label(value), 'neutral']
  const Icon = tone === 'success' ? Check : tone === 'warning' ? Clock3 : tone === 'danger' ? AlertCircle : Circle
  return <span className={'status-tag ' + tone}><Icon size={13} aria-hidden="true" />{text ?? title}</span>
}

export function PageHeader({ title, description, actions, context }: {
  title: string; description?: string; actions?: ReactNode; context?: ReactNode
}) {
  return <div className="page-header">
    <div>{context}<h1>{title}</h1>{description && <p>{description}</p>}</div>
    {actions && <div className="page-actions">{actions}</div>}
  </div>
}

export function Card({ title, note, action, children, className = '' }: {
  title?: string; note?: string; action?: ReactNode; children: ReactNode; className?: string
}) {
  return <section className={'card ' + className}>
    {title && <header className="card-heading"><div><h2>{title}</h2>{note && <p>{note}</p>}</div>{action}</header>}
    {children}
  </section>
}

export function EmptyState({ title, description, action, icon: Icon = FileSearch }: {
  title: string; description: string; action?: ReactNode; icon?: LucideIcon
}) {
  return <div className="blank-state"><span className="blank-icon"><Icon size={23} aria-hidden="true" /></span>
    <h3>{title}</h3><p>{description}</p>{action}</div>
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="callout danger" role="alert"><AlertCircle size={19} aria-hidden="true" />
    <div><strong>Something needs attention</strong><p>{message}</p></div>
    {retry && <button type="button" className="btn secondary" onClick={retry}>Retry</button>}
  </div>
}

export function LoadingSkeleton({ label = 'Loading workspace…' }: { label?: string }) {
  return <div role="status" className="loading-state"><span>{label}</span>
    <div className="loading-bars" aria-hidden="true"><i/><i/><i/></div>
  </div>
}

export const instant = (value?: string) => {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Time unavailable'
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function CopyableIdentifier({ value, name, compact = false }: { value: string; name: string; compact?: boolean }) {
  const [feedback, setFeedback] = useState('')
  return <span className="copy-id">
    <code title={compact ? value : undefined}>{compact && value.length > 14 ? value.slice(0, 8) + '…' + value.slice(-4) : value}</code>
    <button type="button" className="icon-button small" aria-label={'Copy ' + name} title={'Copy ' + name}
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); setFeedback(name + ' copied') }
        catch { setFeedback('Clipboard unavailable. Select the identifier to copy it.') }
      }}><Copy size={14} aria-hidden="true" /></button>
    <span role="status" className={feedback.includes('unavailable') ? 'copy-feedback' : 'visually-hidden'}>{feedback}</span>
  </span>
}

export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return <ol className="step-indicator" aria-label="Progress">
    {steps.map((step, i) => <li key={step} aria-current={i === current ? 'step' : undefined} className={i < current ? 'done' : ''}>
      <span className="step-number">{i < current ? <Check size={15} aria-label="Completed" /> : i + 1}</span>
      <span>{step}</span>
    </li>)}
  </ol>
}

export type TimelineEntry = { id: string; title: string; meta?: string; body?: ReactNode; icon?: LucideIcon }
export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return <ol className="timeline">{entries.map(({ id, title, meta, body, icon: Icon = Circle }) => <li key={id}>
    <span className="timeline-icon"><Icon size={15} aria-hidden="true"/></span>
    <div><div className="timeline-head"><strong>{title}</strong>{meta && <small>{meta}</small>}</div>{body}</div>
  </li>)}</ol>
}

export function FilterToolbar({ children, label = 'Filters' }: { children: ReactNode; label?: string }) {
  return <div className="filter-toolbar" role="group" aria-label={label}>{children}</div>
}

export function TransactionTable({ rows, catalogue, compact = false }: { rows: Payment[]; catalogue: Product[]; compact?: boolean }) {
  return <div className="table-region" tabIndex={0} role="region" aria-label="Transaction table">
    <table className="data-table"><caption className="visually-hidden">Payment proposals in this session</caption>
      <thead><tr><th scope="col">Transaction</th><th scope="col">Amount</th><th scope="col">Decision</th>
        {!compact && <th scope="col">Settlement</th>}<th scope="col">Received</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.id}>
        <td><a href={'#verification?tx=' + row.id} className="table-link">{catalogue.find(p => p.id === row.proposal.product_id)?.title ?? row.proposal.product_id}</a>
          <small>{row.proposal.merchant} <span aria-hidden="true">·</span> <code>{row.id.slice(0, 8)}</code></small></td>
        <td className="amount">{money(row.proposal.amount)}</td><td><StatusBadge value={row.decision} /></td>
        {!compact && <td><StatusBadge value={row.status} /></td>}
        <td className="cell-time">{instant(row.created_at)}</td>
      </tr>)}</tbody>
    </table>
  </div>
}

export function StatisticCard({ title, value, detail, icon: Icon, tone = 'neutral' }: {
  title: string; value: number; detail: string; icon: LucideIcon; tone?: string
}) {
  return <article className="stat-card">
    <div><span className={'stat-icon ' + tone}><Icon size={17} aria-hidden="true" /></span><p>{title}</p></div>
    <strong>{value.toLocaleString('en-IN')}</strong><small>{detail}</small>
  </article>
}

export function ChartContainer({ title, note, children, action }: {
  title: string; note: string; children: ReactNode; action?: ReactNode
}) {
  return <Card title={title} note={note} action={action} className="chart-card">{children}</Card>
}

export function ConfirmationDialog({ title, children, action, danger = false, onConfirm, onCancel }: {
  title: string; children: ReactNode; action: string; danger?: boolean; onConfirm: () => void; onCancel: () => void
}) {
  const titleId = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => { if (element?.open) element.close() }
  }, [])
  return <dialog ref={dialog} className="confirm-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onCancel() }}>
    <h2 id={titleId}>{title}</h2>{children}
    <div className="row-actions">
      <button type="button" className="btn secondary" autoFocus onClick={onCancel}>Cancel</button>
      <button type="button" className={'btn ' + (danger ? 'destructive' : 'primary')} onClick={onConfirm}>{action}</button>
    </div>
  </dialog>
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} className="text-link">{children}<ChevronRight aria-hidden="true" size={16} /></a>
}
export function ActionLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} className="btn primary">{children}<ArrowRight aria-hidden="true" size={16} /></a>
}
export function VerifiedLine({ children }: { children: ReactNode }) {
  return <div className="verified-line"><ShieldCheck size={17} aria-hidden="true" />{children}</div>
}
