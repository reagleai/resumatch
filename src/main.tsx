import React, { useState, lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LandingPage } from '@/components/landing/LandingPage'
import './styles/globals.css'

// Lazy-load App so the Supabase client and all tool-gated modules
// are only imported after authentication succeeds.
const App = lazy(() => import('./App'))

const SESSION_KEY = 'rt_unlocked'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Mirrors isReviewMode() in @/lib/reviewMode, inlined deliberately. Importing
// that module here would pull the review fixtures into the entry chunk, so the
// landing page would preload ~34 kB that production can never execute. The
// import.meta.env.DEV guard is replaced with `false` at build time, leaving
// nothing behind in the production bundle.
function isDevReviewSession(): boolean {
  if (!import.meta.env.DEV) return false
  return new URLSearchParams(window.location.search).get('review') === '1'
}

function AppEntry() {
  const [isUnlocked, setIsUnlocked] = useState(
    () => isDevReviewSession() || sessionStorage.getItem(SESSION_KEY) === 'true'
  )

  if (isUnlocked) {
    return (
      <Suspense
        fallback={
          <div
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--color-bg)',
              color: 'var(--color-primary)',
              fontFamily: 'var(--font-heading)',
              fontSize: '1.5rem',
              fontWeight: 500,
              letterSpacing: '0.5px', wordSpacing: '0.1em',
            }}
          >
            Resumatch
          </div>
        }
      >
        <App />
      </Suspense>
    )
  }

  return <LandingPage onUnlock={() => setIsUnlocked(true)} />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppEntry />
    </QueryClientProvider>
  </React.StrictMode>
)
