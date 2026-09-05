import { useState } from 'react'
import { CheckCircle, Download, ExternalLink, FileText, Printer, RotateCcw } from 'lucide-react'
import DOMPurify from 'dompurify'
import type { GeneratorResult, GeneratorStatus } from '@/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingView } from '@/components/features/LoadingView'
import { ResumeDocument } from '@/components/features/ResumeDocument'
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

  if (status === 'loading') {
    return <LoadingView currentStep={loadingStep} />
  }

  if (status === 'error') {
    return (
      <div className="resume-preview-state">
        <EmptyState
          icon="alert-triangle"
          heading="Generation failed"
          body={error || 'An unexpected error occurred.'}
          action={{ label: 'Try Again', onClick: onRetry }}
        />
      </div>
    )
  }

  if (status === 'success' && result) {
    const isPdf = result.format === 'pdf'

    const handleDownload = () => {
      if (isPdf && result.pdfBlobUrl) {
        const a = document.createElement('a')
        a.href = result.pdfBlobUrl
        a.download = result.filename || 'tailored-resume.pdf'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } else {
        downloadHtml(result.html, result.filename)
      }
      // Show success state on button
      setDownloadSuccess(true)
      toast('Resume downloaded ✓', 'success')
      setTimeout(() => setDownloadSuccess(false), 2000)
    }

    const handlePrint = () => {
      if (isPdf) {
        if (result.pdfBlobUrl) {
          window.open(result.pdfBlobUrl, '_blank', 'noopener,noreferrer')
        }
        toast('PDF opened in new tab. Use Ctrl+P to print.', 'info')
      } else {
        const sanitizedHtml = DOMPurify.sanitize(result.html, { WHOLE_DOCUMENT: true })
        const printWindow = window.open('', '_blank', 'noopener')
        if (printWindow) {
          printWindow.document.write(sanitizedHtml)
          printWindow.document.close()
          printWindow.focus()
          printWindow.print()
        }
        toast('Use your browser\u2019s Save as PDF option.', 'info')
      }
    }

    return (
      <div className="resume-preview-result">
        <div className="preview-toolbar">
          <div className="preview-context">
            <FileText size={16} aria-hidden="true" />
            <span>
              <small>Tailored for</small>
              <strong>{result.roletitle} · {result.companyname}</strong>
            </span>
            {isPdf && (
              <span className="preview-format-badge">PDF</span>
            )}
          </div>

          {!isPdf && (
            <div className="preview-toolbar-actions">
              <button onClick={handleDownload} className="preview-download-btn">
                {downloadSuccess
                  ? <><CheckCircle size={15} aria-hidden="true" /> Downloaded</>
                  : <><Download size={15} aria-hidden="true" /> Download HTML</>
                }
              </button>
              <button onClick={handlePrint} className="preview-action-btn">
                <Printer size={14} aria-hidden="true" /> Print PDF
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
              <span className="resume-ready-kicker"><CheckCircle size={14} aria-hidden="true" /> Generation complete</span>
              <h3>Your tailored resume is ready</h3>
              <p>{result.filename}</p>
            </div>

            <div className="resume-ready-actions">
              <button
                onClick={handleDownload}
                className="preview-download-btn-hero"
                data-success={downloadSuccess}
              >
                {downloadSuccess
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
            title="Tailored Resume Preview"
          />
        )}

        <div className="preview-metadata">
          Generated {formatTimestamp(result.timestamp)} · {result.companyname} · {result.roletitle}
        </div>
      </div>
    )
  }

  // Idle
  return (
    <div className="resume-preview-state is-idle">
      <EmptyState
        icon="file-text"
        heading="Your tailored resume will appear here"
        body="Add a job description, then generate to see and download the result."
      />
    </div>
  )
}
