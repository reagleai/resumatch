import { useState } from 'react'
import { ArrowRight } from 'lucide-react'

/** Illustrative samples written for this page — not output from a real run. */
const EXAMPLES = [
  {
    section: 'Summary',
    before: 'Experienced professional with a background in technology and product development.',
    after: 'Product manager with hands-on experience in AI evaluation systems and marketplace operations.',
  },
  {
    section: 'Experience',
    before: 'Worked on improving user experience. Helped with A/B testing and analytics.',
    after: 'Redesigned onboarding for a B2B marketplace and ran A/B tests on the activation funnel.',
  },
  {
    section: 'Projects',
    before: 'Built an automation tool for resumes. Used AI and some APIs.',
    after: 'Shipped a resume tailoring pipeline that rewrites four sections while locking factual fields.',
  },
]

export function BeforeAfter() {
  const [activeIndex, setActiveIndex] = useState(0)
  const ex = EXAMPLES[activeIndex]

  return (
    <section className="landing-section" style={{ paddingTop: 'var(--space-16)', paddingBottom: 'var(--space-16)' }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 500, color: 'var(--color-text)', textAlign: 'center', letterSpacing: '0.5px', wordSpacing: '0.1em', marginBottom: 'var(--space-3)' }}>
        A rewrite, side by side
      </h2>
      <p style={{ textAlign: 'center', color: 'var(--color-text-faint)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-8)' }}>
        Illustrative examples
      </p>

      {/* Section tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-8)', flexWrap: 'wrap' }}>
        {EXAMPLES.map((item, i) => (
          <button
            key={item.section}
            onClick={() => setActiveIndex(i)}
            aria-pressed={i === activeIndex}
            style={{ padding: '8px 20px', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 500, fontFamily: 'var(--font-body)', border: '1.5px solid', borderColor: i === activeIndex ? 'var(--color-primary)' : 'var(--color-border)', background: i === activeIndex ? 'var(--color-primary-highlight)' : 'transparent', color: i === activeIndex ? 'var(--color-primary)' : 'var(--color-text-muted)', cursor: 'pointer', transition: 'all 0.2s ease' }}
          >
            {item.section}
          </button>
        ))}
      </div>

      {/* Before / After panels */}
      <div className="landing-demo-grid">
        <div className="landing-demo-block">
          <span style={{ display: 'block', marginBottom: 'var(--space-3)', fontSize: 'var(--text-xs)', fontWeight: 500, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const, letterSpacing: '2px', color: 'var(--color-text-faint)' }}>Before</span>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 1.8, fontStyle: 'italic' }}>{ex.before}</p>
        </div>

        <div className="landing-demo-arrow" aria-hidden="true">
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-primary-highlight)', border: '1.5px solid var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowRight size={18} style={{ color: 'var(--color-primary)' }} />
          </div>
        </div>

        <div className="landing-demo-block" style={{ borderColor: 'var(--color-primary)', borderWidth: '1.5px' }}>
          <span style={{ display: 'block', marginBottom: 'var(--space-3)', fontSize: 'var(--text-xs)', fontWeight: 500, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const, letterSpacing: '2px', color: 'var(--color-primary)' }}>After</span>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)', lineHeight: 1.8 }}>{ex.after}</p>
        </div>
      </div>
    </section>
  )
}
