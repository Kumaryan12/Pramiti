import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ChevronRight, CircleHelp, FlaskConical, Menu, Moon, PanelLeftClose, PanelLeftOpen, ShieldCheck, Sun, X,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = { id: string; title: string; icon: LucideIcon }
export type NavGroup = { title: string; items: NavItem[] }

export function Brand({ onClick }: { onClick?: () => void }) {
  return <a className="identity" href="#" onClick={onClick} aria-label="PRAMITI home">
    <span className="identity-mark"><ShieldCheck size={21} aria-hidden="true" /></span>
    <span className="identity-name">PRAMITI <span lang="hi">प्रमिति</span></span>
  </a>
}

export function ThemeButton() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark')
  const label = dark ? 'Use light theme' : 'Use dark theme'
  return <button type="button" className="icon-button" aria-label={label} title={label} onClick={() => {
    const theme = dark ? 'light' : 'dark'
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('pramiti-theme', theme) } catch { /* The theme still applies in this tab. */ }
    setDark(!dark)
  }}>{dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}</button>
}

export function AppShell({ groups, page, status, children }: {
  groups: NavGroup[]; page: string; status: string; children: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const drawer = useRef<HTMLDialogElement>(null)
  const main = useRef<HTMLElement>(null)
  const menu = useRef<HTMLButtonElement>(null)
  const firstPage = useRef(page)
  const title = groups.flatMap(group => group.items).find(item => item.id === page)?.title ?? 'Workspace'
  const groupTitle = groups.find(group => group.items.some(item => item.id === page))?.title ?? 'Workspace'

  useEffect(() => {
    if (firstPage.current !== page) {
      drawer.current?.close()
      main.current?.focus({ preventScroll: true })
      window.scrollTo(0, 0)
      firstPage.current = page
    }
  }, [page])

  function links(close?: () => void) {
    return <nav aria-label="Workspace" className="nav-groups">
      {groups.map(group => <div className="nav-group" key={group.title}>
        <p>{group.title}</p>
        {group.items.map(({ id, title, icon: Icon }) => <a
          key={id} href={'#' + id} title={title} aria-label={title}
          aria-current={page === id ? 'page' : undefined} onClick={close}
        ><Icon size={17} aria-hidden="true" /><span>{title}</span></a>)}
      </div>)}
    </nav>
  }

  return <div className={'institution app-frame' + (collapsed ? ' rail-collapsed' : '')}>
    <a href="#workspace-main" className="skip-link" onClick={event => { event.preventDefault(); main.current?.focus() }}>Skip to main content</a>
    <aside className="desktop-rail">
      <Brand />
      {links()}
      <div className="rail-footer"><FlaskConical size={17} aria-hidden="true" /><span>Simulated payments only</span></div>
    </aside>
    <dialog className="mobile-drawer" ref={drawer} aria-labelledby="drawer-title"
      onClick={event => { if (event.target === drawer.current) drawer.current.close() }}
      onClose={() => { if (document.activeElement === document.body) menu.current?.focus() }}>
      <div className="drawer-body">
        <div className="drawer-head"><h2 id="drawer-title">Workspace navigation</h2>
          <button className="icon-button" type="button" aria-label="Close navigation" onClick={() => drawer.current?.close()}><X size={20} aria-hidden="true" /></button></div>
        {links(() => drawer.current?.close())}
        <div className="rail-footer"><FlaskConical size={17} aria-hidden="true" /><span>Simulated payments only</span></div>
      </div>
    </dialog>
    <div className="app-main">
      <header className="toolbar">
        <div className="toolbar-left">
          <button ref={menu} type="button" className="icon-button menu-button" aria-label="Open navigation"
            onClick={() => drawer.current?.showModal()}><Menu size={20} aria-hidden="true" /></button>
          <button type="button" className="icon-button collapse-button" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-pressed={collapsed} onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
          </button>
          <nav aria-label="Breadcrumb" className="crumb"><span>{groupTitle}</span><ChevronRight size={14} aria-hidden="true" /><strong>{title}</strong></nav>
        </div>
        <div className="toolbar-right">
          <span className="session-state"><FlaskConical size={15} aria-hidden="true" /><span>{status}</span></span>
          <a className="icon-button toolbar-doc" href="#documentation" aria-label="Documentation" title="Documentation"><CircleHelp size={18} aria-hidden="true" /></a>
          <ThemeButton />
        </div>
      </header>
      <main id="workspace-main" ref={main} tabIndex={-1}>{children}</main>
    </div>
  </div>
}
