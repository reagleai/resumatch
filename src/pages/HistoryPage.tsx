import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { useResumeHistoryQuery, useDeleteResumeMutation } from '@/hooks/useResumeHistory'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Modal } from '@/components/ui/Modal'
import { HistoryCard } from '@/components/features/HistoryCard'
import { ResumeDocument } from '@/components/features/ResumeDocument'
import { getReviewParam, isReviewMode } from '@/lib/reviewMode'
import type { SavedResumeWithPdf } from '@/types'

export function HistoryPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: resumes, isLoading, isError, refetch } = useResumeHistoryQuery()
  const deleteMutation = useDeleteResumeMutation()
  const [viewingResume, setViewingResume] = useState<SavedResumeWithPdf | null>(null)

  const reviewState = import.meta.env.DEV && isReviewMode() ? getReviewParam('state') : null
  const reviewSuffix = import.meta.env.DEV && isReviewMode() ? '?review=1' : ''
  const pageIsLoading = reviewState === 'loading' || (reviewState !== 'error' && isLoading)
  const pageIsError = reviewState === 'error' || (reviewState !== 'loading' && isError)
  const visibleResumes = resumes ?? []
  const count = visibleResumes.length
  const reviewPreviewOpened = useRef(false)

  useEffect(() => {
    if (!import.meta.env.DEV || !isReviewMode() || reviewPreviewOpened.current || !resumes?.length) return
    const requested = getReviewParam('preview')
    if (!requested) return
    const resume = resumes.find((item) => item.id === requested) ?? resumes[0]
    const preview = requested === 'pdf-only'
      ? { ...resume, resume_html: '' }
      : requested === 'no-file'
        ? { ...resume, resume_html: '', resume_pdfs: [] }
        : resume
    reviewPreviewOpened.current = true
    setViewingResume(preview)
  }, [resumes])

  const handleDelete = (resume: SavedResumeWithPdf) => {
    const pdf = resume.resume_pdfs?.[0] ?? null
    deleteMutation.mutate(
      { id: resume.id, pdfFilePath: pdf?.file_path },
      {
        onSuccess: () => {
          toast('Resume deleted.', 'info')
        },
        onError: (err) => {
          toast(err instanceof Error ? err.message : 'Failed to delete resume.', 'error')
        },
      }
    )
  }

  return (
    <section
      className="app-page history-page"
      aria-labelledby="history-page-title"
      aria-busy={pageIsLoading}
    >
      <header className="app-page-header page-header history-page-header">
        <div className="page-header-copy">
          <h1 id="history-page-title" className="page-title">
            Resume History
          </h1>
          <p className="page-description">
            Previously generated resumes, persisted across sessions.
          </p>
        </div>

        {!pageIsLoading && !pageIsError && count > 0 && (
          <span
            className="history-count-badge"
            aria-label={`${count} saved ${count === 1 ? 'resume' : 'resumes'}`}
          >
            <strong>{count}</strong>
            <span>{count === 1 ? 'resume' : 'resumes'}</span>
          </span>
        )}
      </header>

      <div className="history-page-content">
        {pageIsLoading && (
          <div className="history-list history-loading-list" role="status">
            <span className="sr-only">Loading resume history…</span>
            {[0, 1, 2].map((item) => (
              <div key={item} className="history-card history-card-skeleton" aria-hidden="true">
                <div className="history-card-main">
                  <Skeleton variant="avatar" width="40px" height="40px" />
                  <div className="history-skeleton-copy">
                    <Skeleton variant="heading" width="58%" />
                    <Skeleton variant="text" width="34%" />
                    <Skeleton variant="text" width="82%" />
                  </div>
                  <div className="history-skeleton-actions">
                    <Skeleton variant="custom" width="76px" height="40px" />
                    <Skeleton variant="custom" width="76px" height="40px" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {pageIsError && (
          <div className="history-state history-error-state">
            <EmptyState
              icon="alert-triangle"
              heading="Couldn't load history"
              body="Something went wrong fetching your resume history. Please try again."
              action={{
                label: 'Retry',
                onClick: () => {
                  refetch()
                },
              }}
            />
          </div>
        )}

        {!pageIsLoading && !pageIsError && count === 0 && (
          <div className="history-state history-empty-state">
            <EmptyState
              icon="clock"
              heading="No resumes yet"
              body="Generated resumes will be automatically saved here. Head to the Generator to create your first tailored resume."
              action={{
                label: 'Go to Generator →',
                onClick: () => navigate(`/generator${reviewSuffix}`),
              }}
            />
          </div>
        )}

        {!pageIsLoading && !pageIsError && count > 0 && (
          <div className="history-records">
            <div className="history-list-header" aria-hidden="true">
              <span>Resume</span>
              <span>Actions</span>
            </div>
            <div className="history-list" role="list" aria-label="Generated resumes">
              {visibleResumes.map((resume, index) => (
                <HistoryCard
                  key={resume.id}
                  resume={resume}
                  index={index}
                  isDeleting={
                    deleteMutation.isPending && deleteMutation.variables?.id === resume.id
                  }
                  onView={() => setViewingResume(resume)}
                  onDelete={() => handleDelete(resume)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={!!viewingResume}
        onClose={() => setViewingResume(null)}
        title={
          viewingResume
            ? `${viewingResume.role_title} · ${viewingResume.company_name}`
            : 'Resume'
        }
      >
        {viewingResume &&
          (viewingResume.resume_html ? (
            <div className="history-preview-shell">
              {viewingResume.resume_pdfs?.[0] && (
                <div className="history-preview-toolbar">
                  <a
                    href={viewingResume.resume_pdfs[0].public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="history-preview-download"
                  >
                    <Download size={15} aria-hidden="true" />
                    Download PDF
                  </a>
                </div>
              )}

              <ResumeDocument
                html={viewingResume.resume_html}
                title="Resume preview"
              />
            </div>
          ) : (
            <div className="history-preview-unavailable">
              <p>HTML preview is unavailable for this resume.</p>
              {viewingResume.resume_pdfs?.[0] ? (
                <a
                  href={viewingResume.resume_pdfs[0].public_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="history-preview-primary-action"
                >
                  <Download size={16} aria-hidden="true" />
                  Download PDF Instead
                </a>
              ) : (
                <p className="history-preview-no-file">
                  No downloadable file available for this resume.
                </p>
              )}
            </div>
          ))}
      </Modal>
    </section>
  )
}
