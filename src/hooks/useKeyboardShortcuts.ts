import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { isReviewMode } from '@/lib/reviewMode'

/**
 * Global keyboard shortcuts for navigation.
 * Alt+1 → Generator, Alt+2 → Profile, Alt+3 → History
 * Escape → close any open modal/popover
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Close any confirm dialogs (handled by components individually)
        return
      }

      const target = e.target as HTMLElement | null
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      if (document.querySelector('dialog[open]')) return

      const key = e.code
      const suffix = import.meta.env.DEV && isReviewMode() ? '?review=1' : ''
      if (key === 'Digit1') {
        e.preventDefault()
        navigate('/generator' + suffix)
      } else if (key === 'Digit2') {
        e.preventDefault()
        navigate('/profile' + suffix)
      } else if (key === 'Digit3') {
        e.preventDefault()
        navigate('/history' + suffix)
      }
    }

    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [navigate])
}
