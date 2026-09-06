import { useState, useEffect, useCallback } from 'react'
import { Sun, Moon } from 'lucide-react'

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    return (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') || 'dark'
  })

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('rt-theme', next)
    setThemeState(next)
  }, [theme])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: 'var(--topbar-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-6)',
        background: scrolled ? 'var(--nav-scrolled-bg)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--color-divider)' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Logo - same pattern as TopBar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            border: '2px solid var(--color-primary)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-heading)',
            fontSize: '1.1rem',
            fontWeight: 500,
            color: 'var(--color-primary)',
            letterSpacing: '0.5px', wordSpacing: '0.1em',
          }}
        >
          RM
        </span>
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 500,
            fontSize: '1.5rem',
            color: 'var(--color-primary)',
            letterSpacing: '0.5px', wordSpacing: '0.1em',
            lineHeight: 1,
          }}
        >
          Resumatch
        </span>
      </div>

      {/* Right - Theme toggle + Access Tool CTA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        {/* Theme toggle - same pattern as TopBar */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle light/dark mode"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--color-primary-highlight)',
            border: '1px solid var(--color-divider)',
            color: 'var(--color-primary)',
            transition: 'all 0.3s ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-primary)'
            e.currentTarget.style.color = 'var(--color-bg)'
            e.currentTarget.style.borderColor = 'var(--color-primary)'
            e.currentTarget.style.transform = 'rotate(30deg)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-primary-highlight)'
            e.currentTarget.style.color = 'var(--color-primary)'
            e.currentTarget.style.borderColor = 'var(--color-divider)'
            e.currentTarget.style.transform = 'rotate(0deg)'
          }}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <a
          href="#access"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: '8px 18px',
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-muted)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-full)',
            textDecoration: 'none',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-primary)'
            e.currentTarget.style.color = 'var(--color-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)'
            e.currentTarget.style.color = 'var(--color-text-muted)'
          }}
        >
          Get early access
        </a>
      </div>
    </nav>
  )
}
