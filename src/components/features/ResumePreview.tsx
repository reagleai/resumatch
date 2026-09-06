import { useState } from 'react'
import { CheckCircle, Download, ExternalLink, FileText, Printer, RotateCcw } from 'lucide-react'
import DOMPurify from 'dompurify'
import type { GeneratorResult, GeneratorStatus } from '@/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingView } from '@/components/features/LoadingView'
import { ResumeDocument } from '@/components/features/ResumeDocument'
import { RewriteScope } from '@/components/features/RewriteScope'
import { downloadHtml, formatTimestamp } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'

interface ResumePreviewProps {
  result: GeneratorResult | null
  status: GeneratorStatus
  loadingStep: number
  error: string | null
  onRetry: () => void
  onClear: () => void
}

export function ResumePreview({ result, status, loadingStep, error, onRetry, onClear }: ResumePreviewProps) {
  const { toast } = useToast()
  const [downloadSuccess, setDownloadSuccess] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  if (status === 'loading') {
    return <LoadingView currentStep={loadingStep} />
  }

  if (status === 'error') {
    return (
      <div className="resume-preview-state">
        <EmptyState
          icon="alert-triangle"
          tone="error"
          heading="Generation failed"
          body={error || 'The server did not return a reason.'}
          action={{ label: 'Try again', onClick: onRetry }}
        />
      </div>
    )
  }

  if (status === 'success' && result) {
    const isPdf = result.format === 'pdf'

    const handleDownload = async () => {
      if (isDownloading) return
      setIsDownloading(true)
      try {
        if (isPdf && result.pdfBlobUrl) {
          const response = await fetch(result.pdfBlobUrl)
          if (!response.ok) throw new Error(`Download failed: ${response.status}`)
          const blobUrl = URL.createObjectURL(await response.blob())
          const anchor = document.createElement('a')
          anchor.href = blobUrl
          anchor.download = result.filename || 'tailored-resume.pdf'
          document.body.appendChild(anchor)
          anchor.click()
          document.body.removeChild(anchor)
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
        } else {
          downloadHtml(result.html, result.filename)
        }
        setDownloadSuccess(true)
        toast('Downloaded', 'success')
        setTimeout(() => setDownloadSuccess(false), 2000)
      } catch {
        if (result.pdfBlobUrl) window.open(result.pdfBlobUrl, '_blank', 'noopener,noreferrer')
        toast('Opened in a new tab — save it from there.', 'info')
      } finally {
        setIsDownloading(false)
      }
    }

    const handlePrint = () => {
      if (isPdf) {
        if (result.pdfBlobUrl) {
          window.open(result.pdfBlobUrl, '_blank', 'noopener,noreferrer')
        }
        toast('Opened in a new tab', 'info')
      } else {
        const sanitizedHtml = DOMPurify.sanitize(result.html, { WHOLE_DOCUMENT: true })
        const printUrl = URL.createObjectURL(new Blob([sanitizedHtml], { type: 'text/html;charset=utf-8' }))
        window.open(printUrl, '_blank', 'noopener,noreferrer')
        setTimeout(() => URL.revokeObjectURL(printUrl), 60_000)
        toast('Opened in a new tab — use Print to save as PDF.', 'info')
      }
    }

    return (
      <div className="resume-preview-result">
        <div className="preview-toolbar">
          <div className="preview-context">
            <FileText size={16} aria-hidden="true" />
            <span>
              <strong>{result.roletitle} · {result.companyname}</strong>
              <small>{formatTimestamp(result.timestamp)}</small>
            </span>
            {isPdf && (
              <span className="preview-format-badge">PDF</span>
            )}
          </div>

          {!isPdf && (
            <div className="preview-toolbar-actions">
              <button onClick={handleDownload} disabled={isDownloading} className="preview-download-btn">
                {isDownloading
                  ? <>Downloading…</>
                  : downloadSuccess
                  ? <><CheckCircle size={15} aria-hidden="true" /> Downloaded</>
                  : <><Download size={15} aria-hidden="true" /> Download HTML</>
                }
              </button>
              <button onClick={handlePrint} className="preview-action-btn">
                <Printer size={14} aria-hidden="true" /> Print
              </button>
              <button onClick={onClear} className="preview-action-btn">
                <RotateCcw size={14} aria-hidden="true" /> Clear
              </button>
            </div>
          )}
        </div>

        {isPdf && result.pdfBlobUrl ? (
          <div className="resume-ready-state">
            <div className="resume-ready-icon"><FileText size={30} aria-hidden="true" /></div>
            <div className="resume-ready-copy">
              <h3>Resume ready</h3>
              <p>{result.filename}</p>
            </div>

            <div className="resume-ready-actions">
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="preview-download-btn-hero"
                data-success={downloadSuccess}
              >
                {isDownloading
                  ? <>Downloading…</>
                  : downloadSuccess
                  ? <><CheckCircle size={18} aria-hidden="true" /> Downloaded</>
                  : <><Download size={18} aria-hidden="true" /> Download PDF</>
                }
              </button>
              <div className="resume-ready-secondary-actions">
                <button type="button" onClick={handlePrint} className="preview-action-btn">
                  <ExternalLink size={14} aria-hidden="true" /> Open in tab
                </button>
                <button type="button" onClick={onClear} className="preview-action-btn">
                  <RotateCcw size={14} aria-hidden="true" /> Start another
                </button>
              </div>
            </div>
          </div>
        ) : (
          <ResumeDocument
            html={result.html}
            title={`Tailored resume for ${result.roletitle} at ${result.companyname}`}
          />
        )}
      </div>
    )
  }

  // Idle — the scope map answers "what will this change?" in place of the
  // sentence that previously restated the panel heading.
  return (
    <div className="resume-preview-state is-idle">
      <EmptyState
        icon="file-text"
        heading="No resume yet"
      >
        <RewriteScope />
      </EmptyState>
    </div>
  )
}
