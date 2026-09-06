import { RewriteScope } from '@/components/features/RewriteScope'

/**
 * Draws the boundary the pipeline works within. Both columns are the product's
 * actual behaviour: four sections are rewritten with one LLM call each
 * (api/_lib/pipeline/refineSection.ts), while entry-head fields are copied
 * verbatim from the base resume by the refiner prompts.
 */
export function WhatChanges() {
  return (
    <section
      id="what-changes"
      className="landing-section"
      style={{
        paddingTop: 'var(--space-16)',
        paddingBottom: 'var(--space-16)',
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-divider)',
        borderBottom: '1px solid var(--color-divider)',
      }}
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
        What changes, what doesn't
      </h2>

      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        <RewriteScope size="full" />
      </div>

      <p
        style={{
          maxWidth: '520px',
          margin: 'var(--space-8) auto 0',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: 'var(--text-sm)',
          lineHeight: 1.7,
        }}
      >
        Rewrites are framed from what your resume already says. Nothing new is invented.
      </p>
    </section>
  )
}
