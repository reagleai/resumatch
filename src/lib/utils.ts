/**
 * Escape HTML special characters for safe rendering
 */
export function escapeHtml(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

/**
 * Format a Date to a locale-aware string
 */
export function formatTimestamp(date: Date): string {
  return date.toLocaleString()
}

/**
 * Compute relative time string (e.g. "2 min ago")
 */
export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

/**
 * Trigger a file download from HTML string
 */
export function downloadHtml(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Extract domain from a URL string
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

/**
 * Strip the internal `[stage]` prefix the pipeline puts on its errors, so a
 * failure reads as a sentence in the UI. Server logs keep the full string.
 */
export function readableError(message: string): string {
  const stripped = message.replace(/^\s*\[[a-zA-Z_-]+\]\s*/, '').trim()
  if (!stripped) return message.trim()
  return stripped.charAt(0).toUpperCase() + stripped.slice(1)
}
