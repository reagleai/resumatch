import { useEffect, useCallback, useRef, useState } from 'react'
import { ArrowRight, FileText, SlidersHorizontal } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useGenerate } from '@/hooks/useGenerate'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { ProfileCard } from '@/components/features/ProfileCard'
import { ProfileGuard } from '@/components/features/ProfileGuard'
import { ResumePreview } from '@/components/features/ResumePreview'
import { TemplateGallery } from '@/components/features/TemplateGallery'
import { getReviewHistoryFixture, getReviewParam, isReviewMode } from '@/lib/reviewMode'

export function GeneratorPage() {
  const isProfileComplete = useAppStore((s) => s.isProfileComplete)
  const profileLoading = useAppStore((s) => s.profileLoading)
  const generator = useAppStore((s) => s.generator)
  const setGeneratorField = useAppStore((s) => s.setGeneratorField)
  const resetGenerator = useAppStore((s) => s.resetGenerator)
  const previewHtml = useAppStore((s) => s.previewHtml)
  const setPreviewHtml = useAppStore((s) => s.setPreviewHtml)
  const reviewStateSeeded = useRef(false)
  const [mobilePane, setMobilePane] = useState<'details' | 'preview'>(
    generator.status === 'idle' ? 'details' : 'preview'
  )

  // Loading-step progression is now driven by the real job status (see
  // useGenerate → setLoadingStep), so no client-side timers are needed.
  const { generate } = useGenerate()

  const profileComplete = isProfileComplete()

  // If there's a preview from history, show it
  const effectiveResult = previewHtml
    ? {
        html: previewHtml,
        filename: 'preview.html',
        companyname: 'Preview',
        roletitle: 'History',
        timestamp: new Date(),
        format: 'html' as const,
      }
    : generator.result

  const effectiveStatus = previewHtml ? ('success' as const) : generator.status

  // Direct, deterministic render states for local review. This branch cannot
  // activate in a production build because isReviewMode() is DEV-gated.
  useEffect(() => {
    if (!import.meta.env.DEV || !isReviewMode() || profileLoading || reviewStateSeeded.current) return

    const reviewState = getReviewParam('state')
    if (!reviewState || !['loading', 'success', 'html', 'error'].includes(reviewState)) return
    reviewStateSeeded.current = true

    const store = useAppStore.getState()
    store.setGeneratorField(
      'jd',
      'Lead the strategy and delivery of AI-assisted product workflows, partner with design and engineering, and improve activation through structured experimentation.'
    )
    store.setGeneratorField('keywords', 'AI products, product strategy, experimentation, analytics')
    setMobilePane('preview')

    if (reviewState === 'loading') {
      const requestedStep = Number(getReviewParam('step') ?? 2)
      store.setGeneratorStatus('loading')
      store.setLoadingStep(Math.min(4, Math.max(0, Number.isFinite(requestedStep) ? requestedStep : 2)))
      return
    }

    if (reviewState === 'error') {
      store.setGeneratorError('The resume could not be generated. Your job details are still here, so you can try again.')
      return
    }

    void getReviewHistoryFixture().then(([resume]) => {
      if (!resume) return
      store.setGeneratorResult({
        html: resume.resume_html,
        filename: reviewState === 'html' ? resume.filename.replace(/\.pdf$/, '.html') : resume.filename,
        companyname: resume.company_name,
        roletitle: resume.role_title,
        timestamp: new Date(resume.created_at),
        format: reviewState === 'html' ? 'html' : 'pdf',
        pdfBlobUrl: reviewState === 'html' ? undefined : resume.resume_pdfs?.[0]?.public_url,
      })
    })
  }, [profileLoading])

  const handleGenerate = useCallback(async () => {
    setPreviewHtml(null)
    setMobilePane('preview')
    await generate()
  }, [generate, setPreviewHtml])

  const handleClear = useCallback(() => {
    setPreviewHtml(null)
    resetGenerator()
    setMobilePane('details')
  }, [resetGenerator, setPreviewHtml])

  const statusLabel = effectiveStatus === 'loading'
    ? 'Generating'
    : effectiveStatus === 'success'
      ? 'Ready'
      : effectiveStatus === 'error'
        ? 'Needs attention'
        : 'Waiting for job details'

  // Keyboard shortcut: Cmd/Ctrl + Enter
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (document.querySelector('dialog[open]')) return
        e.preventDefault()
        if (profileComplete && generator.jd.trim() && generator.status !== 'loading') {
          handleGenerate()
        }
      }
    }
    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [profileComplete, generator.jd, generator.status, handleGenerate])

  return (
    <div className="generator-page">
      <div className="generator-mobile-tabs" role="tablist" aria-label="Generator workspace"
        onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
          event.preventDefault()
          const next = event.key === 'Home' ? 'details' : event.key === 'End' ? 'preview' : mobilePane === 'details' ? 'preview' : 'details'
          setMobilePane(next)
          event.currentTarget.querySelector<HTMLButtonElement>(`#generator-${next}-tab`)?.focus()
        }}
      >
        <button
          id="generator-details-tab"
          type="button"
          role="tab"
          tabIndex={mobilePane === 'details' ? 0 : -1}
          aria-selected={mobilePane === 'details'}
          aria-controls="generator-details-panel"
          className={mobilePane === 'details' ? 'is-active' : ''}
          onClick={() => setMobilePane('details')}
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          Job details
        </button>
        <button
          id="generator-preview-tab"
          type="button"
          role="tab"
          tabIndex={mobilePane === 'preview' ? 0 : -1}
          aria-selected={mobilePane === 'preview'}
          aria-controls="generator-preview-panel"
          className={mobilePane === 'preview' ? 'is-active' : ''}
          onClick={() => setMobilePane('preview')}
        >
          <FileText size={16} aria-hidden="true" />
          Preview
          {effectiveStatus !== 'idle' && <span className={`workspace-tab-dot is-${effectiveStatus}`} />}
        </button>
      </div>

      <section
        id="generator-details-panel"
        className="generator-pane gen-left"
        data-mobile-active={mobilePane === 'details'}
        aria-labelledby="generator-page-title"
      >
        <header className="generator-heading">
          <h1 id="generator-page-title" className="page-title">Generate Resume</h1>
          <p className="page-description">
            Add the role details, then Resumatch adapts your saved resume for the application.
          </p>
        </header>

        {!profileLoading && (profileComplete ? <ProfileCard /> : <ProfileGuard />)}

        <div className="generator-fields">
          <Textarea
            id="input-jd"
            label="Job description"
            required
            rows={8}
            placeholder="Paste the full job description, including the role, responsibilities, qualifications, and tools mentioned."
            value={generator.jd}
            onChange={(e) => setGeneratorField('jd', e.target.value)}
            charCount
            currentLength={generator.jd.length}
          />

          <Textarea
            id="input-keywords"
            label="Priority keywords (optional)"
            rows={2}
            placeholder="Product analytics, A/B testing, SQL, cross-functional leadership"
            value={generator.keywords}
            onChange={(e) => setGeneratorField('keywords', e.target.value)}
            helperText="Included only where your saved resume supports them."
          />
        </div>

        <div className="generator-action-bar">
          <Button
            variant="primary"
            size="lg"
            loading={generator.status === 'loading'}
            disabled={!profileComplete || !generator.jd.trim() || generator.status === 'loading'}
            onClick={handleGenerate}
            rightIcon={generator.status !== 'loading' ? <ArrowRight size={16} /> : undefined}
            className="generator-submit"
          >
            {generator.status === 'loading' ? 'Generating…' : 'Generate tailored resume'}
          </Button>
          <span className="generator-shortcut-hint" aria-hidden="true">⌘ / Ctrl + Enter</span>
        </div>

        <TemplateGallery />
      </section>

      <section
        id="generator-preview-panel"
        className="generator-pane gen-right"
        data-mobile-active={mobilePane === 'preview'}
        aria-labelledby="generator-preview-title"
      >
        <header className="generator-preview-header">
          <div>
            <h2 id="generator-preview-title">Resume preview</h2>
          </div>
          <span className={`generator-status is-${effectiveStatus}`}>
            <span aria-hidden="true" />
            {statusLabel}
          </span>
        </header>
        <div className="generator-preview-surface">
          <ResumePreview
            result={effectiveResult}
            status={effectiveStatus}
            loadingStep={generator.loadingStep}
            error={generator.error}
            onRetry={handleGenerate}
            onClear={handleClear}
          />
        </div>
      </section>
    </div>
  )
}
