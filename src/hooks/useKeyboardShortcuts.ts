import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { isReviewMode } from '@/lib/reviewMode'

/**
 * Global keyboard shortcuts for navigation.
 * Cmd/Ctrl+G → Generator, Cmd/Ctrl+P → Profile, Cmd/Ctrl+H → History
 * Escape → close any open modal/popover
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey

      if (e.key === 'Escape') {
        // Close any confirm dialogs (handled by components individually)
        return
      }

      if (!mod) return
      if (document.querySelector('dialog[open]')) return

      const key = e.key.toLowerCase()
      const suffix = import.meta.env.DEV && isReviewMode() ? '?review=1' : ''
      if (key === 'g') {
        e.preventDefault()
        navigate('/generator' + suffix)
      } else if (key === 'p') {
        e.preventDefault()
        navigate('/profile' + suffix)
      } else if (key === 'h') {
        e.preventDefault()
        navigate('/history' + suffix)
      }
    }

    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [navigate])
}
