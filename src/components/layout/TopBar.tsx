import { NavLink, useLocation } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { ShortcutsPopover } from '@/components/features/ShortcutsPopover'
import { APP_NAV_ITEMS } from '@/components/layout/navigation'
import { isReviewMode } from '@/lib/reviewMode'

export function TopBar() {
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const location = useLocation()
  const reviewSuffix = import.meta.env.DEV && new URLSearchParams(location.search).get('review') === '1'
    ? '?review=1'
    : ''

  return (
    <header role="banner" className="app-topbar">
      <div className="app-topbar-inner">
        <NavLink to={`/generator${reviewSuffix}`} className="app-brand" aria-label="Resumatch generator">
          <span className="app-brand-mark" aria-hidden="true">RM</span>
          <span className="app-brand-name">Resumatch</span>
        </NavLink>

        <nav className="app-primary-nav" aria-label="Main navigation">
          {APP_NAV_ITEMS.map(({ path, label, Icon }) => (
            <NavLink
              key={path}
              to={`${path}${reviewSuffix}`}
              className={({ isActive }) => `app-primary-nav-item${isActive ? ' is-active' : ''}`}
              aria-current={location.pathname === path ? 'page' : undefined}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="app-topbar-actions">
          {import.meta.env.DEV && isReviewMode() && (
            <span className="local-review-badge" title="Local preview with sample data. Changes stay in this browser session.">Local review</span>
          )}
          <div className="app-shortcuts-control"><ShortcutsPopover /></div>

        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="app-icon-button app-theme-toggle"
        >
          {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
        </button>
        </div>
      </div>
    </header>
  )
}
