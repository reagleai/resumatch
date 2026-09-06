import { useId } from 'react'
import { Lock, PenLine } from 'lucide-react'
import { LOCKED_FIELDS, REWRITTEN_SECTIONS } from '@/lib/constants'

interface RewriteScopeProps {
  /** 'compact' fits the generator preview pane; 'full' is used on the landing page. */
  size?: 'compact' | 'full'
}

/**
 * Shows the boundary a run works within: the four sections the pipeline
 * rewrites (one LLM call each) against the fields its prompts copy verbatim.
 * Replaces the paragraphs that previously described this in prose.
 */
export function RewriteScope({ size = 'compact' }: RewriteScopeProps) {
  const rewrittenTitleId = useId()
  const lockedTitleId = useId()

  return (
    <div className={`rewrite-scope is-${size}`}>
      <section className="rewrite-scope-group is-rewritten" aria-labelledby={rewrittenTitleId}>
        <h4 id={rewrittenTitleId}>
          <PenLine size={14} aria-hidden="true" />
          Rewritten
        </h4>
        <ul>
          {REWRITTEN_SECTIONS.map((section) => (
            <li key={section}>{section}</li>
          ))}
        </ul>
      </section>

      <section className="rewrite-scope-group is-locked" aria-labelledby={lockedTitleId}>
        <h4 id={lockedTitleId}>
          <Lock size={14} aria-hidden="true" />
          Kept as written
        </h4>
        <ul>
          {LOCKED_FIELDS.map((field) => (
            <li key={field}>{field}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
