import { useEffect } from 'react'
import { LandingNav } from './LandingNav'
import { LandingHero } from './LandingHero'
import { HowItWorks } from './HowItWorks'
import { WhatChanges } from './WhatChanges'
import { BeforeAfter } from './BeforeAfter'
import { AccessSection } from './AccessSection'

interface LandingPageProps {
  onUnlock: () => void
}

export function LandingPage({ onUnlock }: LandingPageProps) {
  // Override body overflow:hidden so landing page can scroll
  // Also initialize theme (same logic as useTheme hook)
  useEffect(() => {
    document.body.style.overflow = 'auto'

    // Initialize theme for landing page
    const saved = localStorage.getItem('rt-theme')
    if (saved === 'dark' || saved === 'light') {
      document.documentElement.setAttribute('data-theme', saved)
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
    }

    return () => {
      document.body.style.overflow = 'hidden'
    }
  }, [])

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-body)',
        overflowX: 'hidden',
        overflowY: 'auto',
      }}
    >
      <LandingNav />
      <LandingHero />
      <HowItWorks />
      <WhatChanges />
      <BeforeAfter />
      <AccessSection onUnlock={onUnlock} />

      <footer
        style={{
          textAlign: 'center',
          padding: 'var(--space-8) var(--space-6)',
          borderTop: '1px solid var(--color-divider)',
        }}
      >
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
          Built by Ajay Sharma ·{' '}
          <a
            href="https://www.linkedin.com/in/workwithajay/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'underline' }}
          >
            LinkedIn
          </a>
        </p>
      </footer>
    </div>
  )
}
