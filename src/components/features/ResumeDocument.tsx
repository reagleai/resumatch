import { useEffect, useMemo, useRef, useState } from 'react'
import { Maximize2, ZoomIn } from 'lucide-react'
import DOMPurify from 'dompurify'

const PAPER_WIDTH = 794
const PAPER_HEIGHT = 1123

interface ResumeDocumentProps {
  html: string
  title: string
}

/** A shared, sandboxed view of the existing A4 resume documents.
 * Scaling affects only this viewer, never the source or downloaded resume.
 */
export function ResumeDocument({ html, title }: ResumeDocumentProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [availableWidth, setAvailableWidth] = useState(PAPER_WIDTH)
  const [actualSize, setActualSize] = useState(false)
  const [documentUrl, setDocumentUrl] = useState<string>()
  const sanitizedHtml = useMemo(() => DOMPurify.sanitize(html, { WHOLE_DOCUMENT: true }), [html])

  useEffect(() => {
    if (!sanitizedHtml) return
    // Blob URLs are explicitly permitted by the app's existing frame CSP.
    const url = URL.createObjectURL(new Blob([sanitizedHtml], { type: 'text/html' }))
    setDocumentUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [sanitizedHtml])

  useEffect(() => {
    const element = viewportRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const scale = actualSize ? 1 : Math.min(1, Math.max(0.2, (availableWidth - 24) / PAPER_WIDTH))

  return (
    <div className="document-viewer">
      <div className="document-viewer-toolbar">
        <span>A4 preview <span className="document-scale">{Math.round(scale * 100)}%</span></span>
        <button type="button" onClick={() => setActualSize((value) => !value)} aria-pressed={actualSize}>
          {actualSize ? <Maximize2 size={15} aria-hidden="true" /> : <ZoomIn size={15} aria-hidden="true" />}
          {actualSize ? 'Fit width' : 'Actual size'}
        </button>
      </div>
      <div ref={viewportRef} className="document-viewport" tabIndex={0} aria-label={`${title}, scrollable document`}>
        {documentUrl ? (
          <div className="document-paper" style={{ width: PAPER_WIDTH * scale, height: PAPER_HEIGHT * scale }}>
            <iframe
              key={documentUrl}
              title={title}
              src={documentUrl}
              sandbox=""
              style={{ width: PAPER_WIDTH, height: PAPER_HEIGHT, transform: `scale(${scale})` }}
            />
          </div>
        ) : <div className="document-loading" role="status">Loading resume preview…</div>}
      </div>
    </div>
  )
}
