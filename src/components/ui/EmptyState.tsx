import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import {
  FileText, Clock, AlertTriangle, Search, Wand2,
  Brain, PenLine, CheckCircle, Zap, type LucideIcon
} from 'lucide-react'

interface EmptyStateProps {
  icon: string
  heading: string
  /** Omit when the heading alone is unambiguous. */
  body?: string
  action?: { label: string; onClick: () => void }
  bordered?: boolean
  tone?: 'default' | 'error'
  /** Optional visual shown under the copy (e.g. a scope diagram). */
  children?: ReactNode
}

const iconMap: Record<string, LucideIcon> = {
  'file-text': FileText,
  'clock': Clock,
  'alert-triangle': AlertTriangle,
  'search': Search,
  'wand-2': Wand2,
  'brain': Brain,
  'pen-line': PenLine,
  'check-circle': CheckCircle,
  'zap': Zap,
}

export function EmptyState({ icon, heading, body, action, bordered, tone = 'default', children }: EmptyStateProps): ReactNode {
  const IconComponent = iconMap[icon] || FileText

  return (
    <div className={`empty-state${bordered ? ' is-bordered' : ''}${tone === 'error' ? ' is-error' : ''}`}>
      <span className="empty-state-icon" aria-hidden="true">
        <IconComponent size={28} />
      </span>
      <h3>{heading}</h3>
      {body && <p>{body}</p>}
      {action && (
        <Button variant="secondary" onClick={action.onClick} className="empty-state-action">
          {action.label}
        </Button>
      )}
      {children}
    </div>
  )
}
