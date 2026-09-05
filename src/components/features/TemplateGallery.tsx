import { useState } from 'react'
import { ChevronDown, Eye, FileText } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { RESUME_TEMPLATES } from '@/lib/resumeTemplates'
import { getReviewParam, isReviewMode } from '@/lib/reviewMode'
import { ResumeDocument } from '@/components/features/ResumeDocument'

/**
 * Generator-page gallery of resume templates. Each card has an eye icon that
 * opens a sandboxed preview of the template's structure. The "Classic" (base)
 * template is the one generation uses and shows its per-point one-page limits.
 */
export function TemplateGallery() {
  const [previewId, setPreviewId] = useState<string | null>(
    import.meta.env.DEV && isReviewMode() ? getReviewParam('template') : null
  )
  const active = RESUME_TEMPLATES.find((t) => t.id === previewId) ?? null
  const currentTemplate = RESUME_TEMPLATES.find((t) => t.status === 'active')

  return (
    <details className="template-gallery" open={previewId ? true : undefined}>
      <summary className="template-gallery-summary">
        <span className="template-summary-icon"><FileText size={17} aria-hidden="true" /></span>
        <span className="template-summary-copy">
          <span>Template</span>
          <strong>{currentTemplate?.name ?? 'Classic'} · one-page format</strong>
        </span>
        <span className="template-summary-action">
          Preview formats <ChevronDown size={16} aria-hidden="true" />
        </span>
      </summary>

      <div className="template-gallery-content">
        <div className="template-gallery-head">
          <span>Template previews</span>
          <small>Classic is used for generation. Other formats are preview-only.</small>
        </div>

        <div className="template-grid">
          {RESUME_TEMPLATES.map((t) => (
            <div key={t.id} className={`template-card${t.status === 'active' ? ' is-active' : ''}`}>
              <div className="template-card-top">
                <span className="template-card-name">{t.name}</span>
                <span className={`template-badge ${t.status}`}>
                  {t.status === 'active' ? 'In use' : 'Preview only'}
                </span>
              </div>
              <p className="template-card-desc">{t.description}</p>

              {t.budgets && (
                <div className="template-card-budgets" title="Maximum characters that keep the resume on one page">
                  One-page limits: <strong>{t.budgets.maxBulletChars}</strong> characters per bullet ·
                  summary <strong>{t.budgets.summaryChars}</strong> · skills line{' '}
                  <strong>{t.budgets.maxSkillLineChars}</strong>
                </div>
              )}

              <button
                type="button"
                className="template-preview-btn"
                onClick={() => setPreviewId(t.id)}
                aria-label={`Preview the ${t.name} template`}
              >
                <Eye size={14} aria-hidden="true" /> Preview
              </button>
            </div>
          ))}
        </div>
      </div>

      <Modal open={!!active} onClose={() => setPreviewId(null)} title={active ? `${active.name} template` : ''}>
        {active && (
          <ResumeDocument
            title={`${active.name} template preview`}
            html={active.previewHtml}
          />
        )}
      </Modal>
    </details>
  )
}
