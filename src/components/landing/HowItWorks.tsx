import { Fragment } from 'react'
import { ArrowRight, ClipboardPaste, FileDown, PenLine } from 'lucide-react'

const STEPS = [
  {
    icon: ClipboardPaste,
    title: 'Paste the job description',
    body: 'Add must-have keywords if you have any.',
  },
  {
    icon: PenLine,
    title: 'Four sections rewritten',
    body: 'Summary, experience, projects and skills — one pass each.',
  },
  {
    icon: FileDown,
    title: 'Download the PDF',
    body: 'One page, saved to your history.',
  },
]

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="landing-section"
      style={{ paddingTop: 'var(--space-16)', paddingBottom: 'var(--space-16)' }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
          fontWeight: 500,
          color: 'var(--color-text)',
          textAlign: 'center',
          letterSpacing: '0.5px',
          wordSpacing: '0.1em',
          marginBottom: 'var(--space-10)',
        }}
      >
        How it works
      </h2>

      <div className="landing-flow">
        {STEPS.map((step, index) => (
          <Fragment key={step.title}>
            <div className="landing-flow-step">
              <span className="landing-flow-icon" aria-hidden="true">
                <step.icon size={22} />
              </span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
            {index < STEPS.length - 1 && (
              <span className="landing-flow-arrow" aria-hidden="true">
                <ArrowRight size={20} />
              </span>
            )}
          </Fragment>
        ))}
      </div>
    </section>
  )
}
