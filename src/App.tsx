import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { GeneratorPage } from '@/pages/GeneratorPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { HistoryPage } from '@/pages/HistoryPage'
import { useTheme } from '@/hooks/useTheme'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useProfileQuery } from '@/hooks/useProfile'
import { useAppStore } from '@/store/appStore'
import { APP_NAV_ITEMS } from '@/components/layout/navigation'

function RouteEffects() {
  const { pathname } = useLocation()
  const route = APP_NAV_ITEMS.find((item) => item.path === pathname)
  const pageName = route?.label ?? 'Generator'

  useEffect(() => {
    document.title = `${pageName} | Resumatch`
    requestAnimationFrame(() => {
      if (!document.querySelector('dialog[open]')) {
        document.querySelector<HTMLElement>('#main-content')?.focus({ preventScroll: true })
      }
    })
  }, [pageName, pathname])

  return <span className="sr-only" aria-live="polite" aria-atomic="true">{pageName} page</span>
}

function AppRedirect() {
  const { search } = useLocation()
  const keepReview = import.meta.env.DEV && new URLSearchParams(search).get('review') === '1'
  return <Navigate to={`/generator${keepReview ? '?review=1' : ''}`} replace />
}

function AppContent() {
  useTheme()
  useKeyboardShortcuts()

  // Fetch profile from Supabase on app load and sync to Zustand store
  // so all pages (including Generator) see the profile data immediately.
  const { data: remoteProfile, isFetched } = useProfileQuery()
  const setProfile = useAppStore((s) => s.setProfile)
  const setProfileLoading = useAppStore((s) => s.setProfileLoading)

  useEffect(() => {
    if (isFetched) {
      if (remoteProfile) {
        setProfile(remoteProfile)
      }
      setProfileLoading(false)
    }
  }, [remoteProfile, isFetched, setProfile, setProfileLoading])

  return (
    <AppShell>
      <RouteEffects />
      <Routes>
        <Route path="/" element={<AppRedirect />} />
        <Route path="/generator" element={<GeneratorPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="*" element={<AppRedirect />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
