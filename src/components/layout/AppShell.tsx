import type { ReactNode } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { ToastContainer } from '@/components/ui/Toast'
import { useAppStore } from '@/store/appStore'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const theme = useAppStore((s) => s.theme)

  return (
    <div
      className="app-shell"
      data-theme={theme}
    >
      {/* Skip to content */}
      <a
        href="#main-content"
        className="app-skip-link"
      >
        Skip to content
      </a>

      <TopBar />

      <main id="main-content" className="app-main" tabIndex={-1}>
        {children}
      </main>

      <MobileTabBar />
      <ToastContainer />
    </div>
  )
}
