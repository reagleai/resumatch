import { useState, useCallback } from 'react'
import { Eye, EyeOff, Lock, ShieldAlert, ShieldCheck } from 'lucide-react'

const SESSION_KEY = 'rt_unlocked'
const MAX_ATTEMPTS = 10
let failedAttempts = 0
let lockoutUntil = 0

function getBackoffMs(): number {
  if (failedAttempts <= 1) return 0
  return Math.min(2 ** (failedAttempts - 1) * 1000, 30_000)
}

interface AccessSectionProps {
  onUnlock: () => void
}

export function AccessSection({ onUnlock }: AccessSectionProps) {
  // --- Expand/collapse ---
  const [isExpanded, setIsExpanded] = useState(false)

  // --- Waitlist state ---
  const [viewMode, setViewMode] = useState<'waitlist' | 'password'>('waitlist')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [preferences, setPreferences] = useState({
    mustHaveKeywords: false,
    aggressiveReframing: false,
  })

  // --- Password state (preserved exactly) ---
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [shake, setShake] = useState(false)
  const [isLockedOut, setIsLockedOut] = useState(false)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

  // --- Password handlers (preserved exactly) ---
  const handleUnlock = useCallback(() => {
    if (failedAttempts >= MAX_ATTEMPTS) {
      setIsLockedOut(true)
      setError('Too many attempts. Reload the page to try again.')
      return
    }
    const now = Date.now()
    if (now < lockoutUntil) {
      const remaining = Math.ceil((lockoutUntil - now) / 1000)
      setCooldownRemaining(remaining)
      setError(`Too many attempts. Wait ${remaining}s before trying again.`)
      return
    }
    setIsValidating(true)
    setError('')
    setTimeout(() => {
      const correctPassword = import.meta.env.VITE_APP_PASSWORD
      if (password === correctPassword) {
        sessionStorage.setItem(SESSION_KEY, 'true')
        onUnlock()
        failedAttempts = 0
      } else {
        failedAttempts++
        if (failedAttempts >= MAX_ATTEMPTS) {
          setIsLockedOut(true)
          setError('Too many attempts. Reload the page to try again.')
        } else {
          const backoffMs = getBackoffMs()
          if (backoffMs > 0) {
            lockoutUntil = Date.now() + backoffMs
            const secs = Math.ceil(backoffMs / 1000)
            setCooldownRemaining(secs)
            setError(`Incorrect password. Wait ${secs}s before trying again.`)
            const interval = setInterval(() => {
              const rem = Math.ceil((lockoutUntil - Date.now()) / 1000)
              if (rem <= 0) { setCooldownRemaining(0); setError(''); clearInterval(interval) }
              else { setCooldownRemaining(rem); setError(`Incorrect password. Wait ${rem}s before trying again.`) }
            }, 1000)
          } else {
            setError('Incorrect password')
          }
          setShake(true)
          setTimeout(() => setShake(false), 500)
        }
      }
      setIsValidating(false)
    }, 300)
  }, [password, onUnlock])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && password && !isValidating && !isLockedOut && cooldownRemaining <= 0) {
      e.preventDefault()
      handleUnlock()
    }
  }, [password, isValidating, isLockedOut, cooldownRemaining, handleUnlock])

  const isDisabled = !password || isValidating || isLockedOut || cooldownRemaining > 0

  // --- Waitlist submit handler ---
  // Posts to the backend /api/waitlist endpoint, which stores the signup in
  // Supabase (resumatch_waitlist). Replaces the former n8n webhook.
  const handleWaitlistSubmit = useCallback(async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Enter a valid email address')
      return
    }
    setIsSubmitting(true)
    setEmailError('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          preferences: {
            mustHaveKeywords: preferences.mustHaveKeywords,
            aggressiveReframing: preferences.aggressiveReframing,
          },
          source: 'resumatch-waitlist',
          timestamp: new Date().toISOString(),
        }),
      })
      if (res.ok) {
        setIsSubmitting(false)
        setIsSubmitted(true)
      } else {
        setIsSubmitting(false)
        setEmailError("Couldn't submit. Try again.")
      }
    } catch {
      setIsSubmitting(false)
      setEmailError("Couldn't submit. Check your connection.")
    }
  }, [email, preferences])

  return (
    <section id="access" className="landing-section" style={{ paddingTop: 'var(--space-16)', paddingBottom: 'var(--space-16)' }}>
      <div style={{ maxWidth: '440px', margin: '0 auto', textAlign: 'center' }}>

        {/* ===== COLLAPSED STATE ===== */}
        {!isExpanded ? (
          <button
            onClick={() => setIsExpanded(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 'var(--space-3)',
              padding: 'var(--space-4) var(--space-6)',
              background: 'var(--color-surface)', border: '1px solid var(--color-divider)',
              borderRadius: 'var(--radius-lg)', cursor: 'pointer',
              transition: 'all 0.3s ease', width: '100%', justifyContent: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-divider)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-muted)' }}>
              Get early access
            </span>
          </button>
        ) : (
          <>
            {/* ===== MODE A: WAITLIST ===== */}
            {viewMode === 'waitlist' && (
              <>
                {!isSubmitted ? (
                  <div style={{ animation: 'cardIn 0.3s ease both' }}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 500, color: 'var(--color-text)', letterSpacing: '0.5px', wordSpacing: '0.1em', marginBottom: 'var(--space-2)' }}>
                      Join the early access list
                    </h3>

                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 'var(--space-6)' }}>
                      Access opens in small batches. We'll email you when a spot is free.
                    </p>

                    {/* Email input */}
                    <input
                      type="email"
                      placeholder="your@email.com"
                      aria-label="Email address"
                      aria-invalid={!!emailError}
                      aria-describedby={emailError ? 'waitlist-email-error' : undefined}
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError('') }}
                      style={{
                        width: '100%', padding: 'var(--space-3) var(--space-4)',
                        fontSize: 'var(--text-base)', fontFamily: 'var(--font-body)',
                        background: 'var(--color-surface-offset)', border: `1.5px solid ${emailError ? 'var(--color-error)' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-lg)', color: 'var(--color-text)', outline: 'none',
                        transition: 'border-color 0.2s ease, box-shadow 0.2s ease', boxSizing: 'border-box',
                        marginBottom: 'var(--space-3)',
                      }}
                      onFocus={(e) => { if (!emailError) { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-highlight)' } }}
                      onBlur={(e) => { if (!emailError) { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' } }}
                    />

                    {/* Email error */}
                    {emailError && (
                      <div id="waitlist-email-error" role="alert" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)', marginBottom: 'var(--space-3)', animation: 'pageIn 0.2s ease' }}>
                        {emailError}
                      </div>
                    )}

                    {/* Preference checkboxes */}
                    <div style={{ textAlign: 'left', marginBottom: 'var(--space-4)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)', display: 'block', textAlign: 'left', fontStyle: 'italic' }}>
                        Optional — what should we build first?
                      </span>

                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={preferences.mustHaveKeywords}
                          onChange={() => setPreferences(p => ({ ...p, mustHaveKeywords: !p.mustHaveKeywords }))}
                          style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px', cursor: 'pointer', marginTop: '3px', flexShrink: 0 }}
                        />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text)', fontWeight: 500 }}>Always include my keywords</span>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', fontStyle: 'italic', lineHeight: 1.4 }}>Target role, tools, stack</span>
                        </span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={preferences.aggressiveReframing}
                          onChange={() => setPreferences(p => ({ ...p, aggressiveReframing: !p.aggressiveReframing }))}
                          style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px', cursor: 'pointer', marginTop: '3px', flexShrink: 0 }}
                        />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text)', fontWeight: 500 }}>Reframe my experience more boldly</span>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', fontStyle: 'italic', lineHeight: 1.4 }}>“worked on” → “owned and shipped”</span>
                        </span>
                      </label>
                    </div>

                    {/* Submit button */}
                    <button
                      onClick={handleWaitlistSubmit}
                      disabled={isSubmitting}
                      style={{
                        width: '100%', padding: 'var(--space-3) var(--space-6)',
                        fontSize: 'var(--text-sm)', fontWeight: 500, fontFamily: 'var(--font-body)',
                        background: isSubmitting ? 'var(--color-surface-2)' : 'var(--color-primary)',
                        color: isSubmitting ? 'var(--color-text-muted)' : '#fff',
                        border: 'none', borderRadius: 'var(--radius-lg)',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease', minHeight: '48px',
                      }}
                      onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.opacity = '0.9' }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
                    >
                      {isSubmitting ? 'Submitting…' : 'Request access'}
                    </button>

                    {/* Switch to password */}
                    <button
                      onClick={() => setViewMode('password')}
                      style={{
                        fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)',
                        marginTop: 'var(--space-4)', display: 'block',
                        background: 'none', border: 'none', cursor: 'pointer',
                        textDecoration: 'none', margin: 'var(--space-4) auto 0',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }}
                      onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}
                    >
                      Already have a password?
                    </button>
                  </div>
                ) : (
                  /* ---- Submitted success state ---- */
                  <div style={{ animation: 'cardIn 0.3s ease both' }}>
                    <div style={{ marginBottom: 'var(--space-6)' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: 'var(--radius-lg)', background: 'var(--color-primary-highlight)', marginBottom: 'var(--space-3)' }}>
                        <ShieldCheck size={24} style={{ color: 'var(--color-primary)' }} />
                      </div>
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 500, color: 'var(--color-text)', letterSpacing: '0.5px', wordSpacing: '0.1em', marginBottom: 'var(--space-1)' }}>
                        You're on the list
                      </h3>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                        We'll email you when a spot is free.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ===== MODE B: PASSWORD ===== */}
            {viewMode === 'password' && (
              <div style={{ animation: 'cardIn 0.3s ease both' }}>
                {/* Back button */}
                <button
                  onClick={() => { setViewMode('waitlist'); setPassword(''); setError(''); setShake(false) }}
                  style={{
                    fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    marginBottom: 'var(--space-4)', display: 'block',
                  }}
                >
                  ← Back
                </button>

                {/* Icon */}
                <div style={{ marginBottom: 'var(--space-6)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: 'var(--radius-lg)', background: 'var(--color-primary-highlight)', marginBottom: 'var(--space-3)' }}>
                    {isLockedOut ? <ShieldAlert size={24} style={{ color: 'var(--color-error)' }} /> : <Lock size={24} style={{ color: 'var(--color-primary)' }} />}
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 500, color: isLockedOut ? 'var(--color-error)' : 'var(--color-text)', letterSpacing: '0.5px', wordSpacing: '0.1em', marginBottom: 'var(--space-1)' }}>
                    {isLockedOut ? 'Access locked' : 'Enter your password'}
                  </h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                    {isLockedOut ? 'Reload the page to try again' : 'Your session ends when you close the tab'}
                  </p>
                </div>

                {/* Password input */}
                <div style={{ position: 'relative', marginBottom: 'var(--space-3)', animation: shake ? 'authShake 0.4s ease' : undefined }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (error && cooldownRemaining <= 0) setError('') }}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter password"
                    aria-label="Password"
                    aria-invalid={!!error}
                    aria-describedby={error ? 'access-password-error' : undefined}
                    autoFocus
                    disabled={isValidating || isLockedOut}
                    style={{
                      width: '100%', padding: 'var(--space-3) var(--space-4)', paddingRight: '48px',
                      fontSize: 'var(--text-base)', fontFamily: 'var(--font-body)',
                      background: 'var(--color-surface-offset)', border: `1.5px solid ${error ? 'var(--color-error)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-lg)', color: 'var(--color-text)', outline: 'none',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease', boxSizing: 'border-box',
                      opacity: isLockedOut ? 0.5 : 1,
                    }}
                    onFocus={(e) => { if (!error) { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-highlight)' } }}
                    onBlur={(e) => { if (!error) { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' } }}
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Error */}
                {error && (
                  <div id="access-password-error" role="alert" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)', marginBottom: 'var(--space-3)', animation: 'pageIn 0.2s ease' }}>
                    {error}
                  </div>
                )}

                {/* Unlock button */}
                <button
                  onClick={handleUnlock}
                  disabled={isDisabled}
                  style={{
                    width: '100%', padding: 'var(--space-3) var(--space-6)',
                    fontSize: 'var(--text-sm)', fontWeight: 500, fontFamily: 'var(--font-body)',
                    background: isDisabled ? 'var(--color-surface-2)' : 'var(--color-primary)',
                    color: isDisabled ? 'var(--color-text-muted)' : '#fff',
                    border: 'none', borderRadius: 'var(--radius-lg)',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease', minHeight: '48px',
                  }}
                  onMouseEnter={(e) => { if (!isDisabled) e.currentTarget.style.opacity = '0.9' }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
                >
                  {isLockedOut ? 'Reload the page' : cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s…` : isValidating ? 'Checking…' : 'Unlock'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes authShake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(6px); }
          45% { transform: translateX(-4px); }
          60% { transform: translateX(2px); }
          75% { transform: translateX(-1px); }
        }
      `}</style>
    </section>
  )
}
