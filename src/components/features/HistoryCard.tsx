import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { Download, Eye, Loader2, Trash2 } from 'lucide-react'
import type { SavedResumeWithPdf } from '@/types'
import { timeAgo } from '@/lib/utils'

interface HistoryCardProps {
  resume: SavedResumeWithPdf
  index: number
  isDeleting: boolean
  onView: () => void
  onDelete: () => void
}

export function HistoryCard({ resume, index, isDeleting, onView, onDelete }: HistoryCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const deletePromptId = useId()
  const deleteTriggerRef = useRef<HTMLButtonElement>(null)
  const confirmDeleteRef = useRef<HTMLButtonElement>(null)
  const pdf = resume.resume_pdfs?.[0] ?? null
  const isPdf = resume.format === 'pdf'
  const createdAt = new Date(resume.created_at)

  const jdSnippet = resume.job_description
    ? resume.job_description.substring(0, 80) + (resume.job_description.length > 80 ? '…' : '')
    : null

  useEffect(() => {
    if (confirmDelete) confirmDeleteRef.current?.focus()
  }, [confirmDelete])

  const handleDeleteClick = () => {
    if (confirmDelete || isDeleting) return
    setConfirmDelete(true)
  }

  const handleConfirm = () => {
    setConfirmDelete(false)
    onDelete()
  }

  const handleCancel = () => {
    setConfirmDelete(false)
    requestAnimationFrame(() => deleteTriggerRef.current?.focus())
  }

  const handleDownload = async () => {
    if (!pdf || isDownloading) return

    setIsDownloading(true)
    try {
      const response = await fetch(pdf.public_url)
      if (!response.ok) throw new Error(`Download failed: ${response.status}`)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = blobUrl
      anchor.download = resume.filename || 'tailored-resume.pdf'
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(pdf.public_url, '_blank', 'noopener,noreferrer')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <article
      className={`history-card${isDeleting ? ' is-deleting' : ''}${confirmDelete ? ' is-confirming-delete' : ''}`}
      role="listitem"
      aria-busy={isDeleting}
      style={{ '--history-row-index': index } as CSSProperties}
    >
      <div className="history-card-main">
        <span className={`history-format-badge ${isPdf ? 'is-pdf' : 'is-html'}`}>
          {isPdf ? 'PDF' : 'HTML'}
        </span>

        <button
          type="button"
          className="history-record-trigger"
          onClick={onView}
          disabled={isDeleting}
          aria-label={`Preview ${resume.role_title} resume for ${resume.company_name}`}
        >
          <span className="history-record-title">
            <span className="history-role-title">{resume.role_title}</span>
            <span className="history-title-separator" aria-hidden="true">·</span>
            <span className="history-company-name">{resume.company_name}</span>
          </span>

          <span className="history-record-meta">
            <time dateTime={resume.created_at} title={createdAt.toLocaleString()}>
              {timeAgo(createdAt)}
            </time>
            {pdf && <span className="history-pdf-status">PDF saved</span>}
          </span>

          {jdSnippet && <span className="history-jd-snippet">{jdSnippet}</span>}
        </button>

        {!confirmDelete && (
          <div className="history-card-actions" role="group" aria-label="Resume actions">
            <button
              type="button"
              onClick={onView}
              disabled={isDeleting}
              aria-label="Preview resume"
              title="Preview resume"
              className="history-action-btn history-view-action"
            >
              <Eye size={16} aria-hidden="true" />
              <span className="history-action-label">Preview</span>
            </button>

            {pdf && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading || isDeleting}
                aria-label={isDownloading ? 'Downloading PDF' : 'Download PDF'}
                title="Download PDF"
                className="history-action-btn history-download-action"
              >
                {isDownloading ? (
                  <Loader2 className="history-action-spinner" size={16} aria-hidden="true" />
                ) : (
                  <Download size={16} aria-hidden="true" />
                )}
                <span className="history-action-label">
                  {isDownloading ? 'Downloading…' : 'Download'}
                </span>
              </button>
            )}

            <button
              ref={deleteTriggerRef}
              type="button"
              onClick={handleDeleteClick}
              disabled={isDeleting}
              aria-label="Delete resume"
              aria-controls={deletePromptId}
              title="Delete resume"
              className="history-action-btn history-delete-action"
            >
              {isDeleting ? (
                <Loader2 className="history-action-spinner" size={16} aria-hidden="true" />
              ) : (
                <Trash2 size={16} aria-hidden="true" />
              )}
              <span className="history-action-label">Delete</span>
            </button>
          </div>
        )}
      </div>

      {confirmDelete && (
        <div
          id={deletePromptId}
          className="history-delete-confirmation"
          role="group"
          aria-labelledby={`${deletePromptId}-label`}
          onKeyDown={(event) => { if (event.key === 'Escape') handleCancel() }}
        >
          <div className="history-delete-copy">
            <strong id={`${deletePromptId}-label`}>Delete this resume?</strong>
            <span>
              {pdf
                ? 'The saved resume and its PDF will be removed.'
                : 'The saved resume will be removed.'}
            </span>
          </div>
          <div className="history-delete-actions">
            <button
              ref={confirmDeleteRef}
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="history-confirm-delete-btn"
            >
              {isDeleting && (
                <Loader2 className="history-action-spinner" size={14} aria-hidden="true" />
              )}
              Delete resume
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isDeleting}
              className="history-cancel-delete-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
