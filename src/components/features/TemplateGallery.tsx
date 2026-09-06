import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Eye, FileText } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { RESUME_TEMPLATES } from '@/lib/resumeTemplates'
import { getReviewParam, isReviewMode } from '@/lib/reviewMode'
import { ResumeDocument } from '@/components/features/ResumeDocument'

/**
 * Generator-page gallery of resume templates. Each card opens a sandboxed
 * preview of the template's structure. "Classic" (base) is the one generation
 * uses; its per-point character limits are shown as a metric row.
 */
export function TemplateGallery() {
  const [previewId, setPreviewId] = useState<string | null>(
    import.meta.env.DEV && isReviewMode() ? getReviewParam('template') : null
  )
  const galleryRef = useRef<HTMLDetailsElement>(null)
  const active = RESUME_TEMPLATES.find((t) => t.id === previewId) ?? null
  const currentTemplate = RESUME_TEMPLATES.find((t) => t.status === 'active')

  useEffect(() => {
    if (previewId && galleryRef.current) galleryRef.current.open = true
  }, [previewId])

  return (
    <>
      <details ref={galleryRef} className="template-gallery">
        <summary className="template-gallery-summary">
          <span className="template-summary-icon"><FileText size={17} aria-hidden="true" /></span>
          <span className="template-summary-copy">
            <span>Template</span>
            <strong>{currentTemplate?.name ?? 'Classic'} · one page</strong>
          </span>
          <span className="template-summary-action">
            Preview <ChevronDown size={16} aria-hidden="true" />
          </span>
        </summary>

        <div className="template-gallery-content">
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
                  <dl className="template-card-budgets" aria-label="Character limits that keep the resume on one page">
                    <div>
                      <dt>Bullet</dt>
                      <dd>{t.budgets.maxBulletChars}</dd>
                    </div>
                    <div>
                      <dt>Summary</dt>
                      <dd>{t.budgets.summaryChars}</dd>
                    </div>
                    <div>
                      <dt>Skills line</dt>
                      <dd>{t.budgets.maxSkillLineChars}</dd>
                    </div>
                  </dl>
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
      </details>

      <Modal open={!!active} onClose={() => setPreviewId(null)} title={active ? `${active.name} template` : ''}>
        {active && (
          <ResumeDocument
            title={`${active.name} template preview`}
            html={active.previewHtml}
          />
        )}
      </Modal>
    </>
  )
}
