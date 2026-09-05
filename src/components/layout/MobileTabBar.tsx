import { NavLink, useLocation } from 'react-router-dom'
import { APP_NAV_ITEMS } from '@/components/layout/navigation'

export function MobileTabBar() {
  const location = useLocation()
  const reviewSuffix = import.meta.env.DEV && new URLSearchParams(location.search).get('review') === '1'
    ? '?review=1'
    : ''

  return (
    <nav className="mobile-tabbar" aria-label="Mobile navigation">
      {APP_NAV_ITEMS.map(({ path, label, shortLabel, Icon }) => (
        <NavLink
          key={path}
          to={`${path}${reviewSuffix}`}
          aria-label={label}
          aria-current={location.pathname === path ? 'page' : undefined}
          className={({ isActive }) => `mobile-tabbar-item${isActive ? ' is-active' : ''}`}
        >
          <Icon size={21} aria-hidden="true" />
          <span>{shortLabel}</span>
        </NavLink>
      ))}
    </nav>
  )
}
