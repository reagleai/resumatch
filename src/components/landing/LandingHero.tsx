import { ArrowRight, FileDown, FileText } from 'lucide-react'

export function LandingHero() {
  return (
    <section
      className="landing-section landing-hero"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        paddingTop: 'calc(var(--topbar-height) + var(--space-8))',
        paddingBottom: 'var(--space-16)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle background glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(62, 204, 144, 0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <h1
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
          fontWeight: 500,
          color: 'var(--color-text)',
          letterSpacing: '0px',
          wordSpacing: '0.1em',
          lineHeight: 1.1,
          maxWidth: '820px',
          marginBottom: 'var(--space-5)',
        }}
      >
        One resume, rewritten for{' '}
        <span style={{ color: 'var(--color-primary)' }}>the job you're applying to.</span>
      </h1>

      <p
        style={{
          fontSize: 'clamp(1rem, 2vw, 1.15rem)',
          color: 'var(--color-text-muted)',
          maxWidth: '520px',
          lineHeight: 1.6,
          marginBottom: 'var(--space-8)',
        }}
      >
        Paste a job description. Get a one-page PDF built from your own resume.
      </p>

      <div className="landing-hero-actions">
        <a
          href="#access"
          className="btn-base btn-primary-variant btn-size-lg"
          style={{ textDecoration: 'none', gap: 'var(--space-2)' }}
        >
          Get early access
          <ArrowRight size={16} aria-hidden="true" />
        </a>
        <a href="#how-it-works" className="landing-hero-secondary">
          How it works
        </a>
      </div>

      {/* Input to output preview. The panels mirror the real generator layout. */}
      <div className="landing-hero-preview">
        <div className="landing-hero-preview-bar">
          <span className="landing-hero-dot" style={{ background: 'var(--color-error)' }} />
          <span className="landing-hero-dot" style={{ background: 'var(--color-warning)' }} />
          <span className="landing-hero-dot" style={{ background: 'var(--color-success)' }} />
          <span className="landing-hero-preview-name">resumatch</span>
        </div>

        <div className="landing-hero-panels">
          <div
            className="landing-hero-panel-left"
            style={{ padding: 'var(--space-6)', borderRight: '1px solid var(--color-divider)' }}
          >
            <div className="landing-hero-panel-title">
              <FileText size={14} aria-hidden="true" />
              Job description
            </div>
            <div className="landing-hero-jd">
              <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>
                Associate Product Manager
              </span>
              <br />
              Drive product strategy for our platform. Work with engineering, design and data to ship
              features that solve real user problems…
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <span className="tag-pill" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>Product Analytics</span>
              <span className="tag-pill" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>A/B Testing</span>
              <span className="tag-pill" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>SQL</span>
            </div>
          </div>

          <div className="landing-hero-panel-right" style={{ padding: 'var(--space-6)' }}>
            <div className="landing-hero-panel-title" style={{ color: 'var(--color-primary)' }}>
              <FileDown size={14} aria-hidden="true" />
              Tailored resume · PDF
            </div>
            <div className="landing-hero-doc" aria-hidden="true">
              <div className="skeleton" style={{ height: '14px', width: '55%', marginBottom: 'var(--space-2)' }} />
              <div className="skeleton" style={{ height: '9px', width: '75%', marginBottom: 'var(--space-4)' }} />
              <div style={{ height: '1px', background: 'var(--color-divider)', marginBottom: 'var(--space-3)' }} />
              {['Summary', 'Experience', 'Projects', 'Skills'].map((section) => (
                <div className="landing-hero-doc-block" key={section}>
                  <span className="landing-hero-doc-label">{section}</span>
                  <div className="skeleton" style={{ height: '8px', width: '92%' }} />
                  <div className="skeleton" style={{ height: '8px', width: '78%' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
