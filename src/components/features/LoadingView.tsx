import { LOADING_STEPS } from '@/lib/constants'
import { Check, Loader2 } from 'lucide-react'

interface LoadingViewProps {
  currentStep: number
}

export function LoadingView({ currentStep }: LoadingViewProps) {
  const step = LOADING_STEPS[currentStep] || LOADING_STEPS[0]
  const progress = Math.max(8, ((currentStep + 1) / LOADING_STEPS.length) * 100)

  return (
    <div className="generation-loading" role="status" aria-live="polite">
      <div className="generation-loading-head">
        <div>
          <span>Building your tailored resume</span>
          <strong>{step.label}</strong>
        </div>
        <span className="generation-step-count">{currentStep + 1} / {LOADING_STEPS.length}</span>
      </div>

      <div className="generation-progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <ol className="generation-steps" aria-label="Generation progress">
        {LOADING_STEPS.map((loadingStep, index) => {
          const state = index < currentStep ? 'complete' : index === currentStep ? 'current' : 'upcoming'
          return (
            <li key={loadingStep.label} className={`is-${state}`}>
              <span className="generation-step-icon" aria-hidden="true">
                {state === 'complete' ? <Check size={13} /> : state === 'current' ? <Loader2 size={13} /> : index + 1}
              </span>
              <span>{loadingStep.label.replace(/\.\.\.$/, '')}</span>
            </li>
          )
        })}
      </ol>

      <div className="generation-document-skeleton" aria-hidden="true">
        <div className="skeleton generation-skeleton-title" />
        <div className="skeleton generation-skeleton-contact" />
        <div className="generation-skeleton-rule" />
        {[0, 1, 2].map((group) => (
          <div className="generation-skeleton-group" key={group}>
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        ))}
      </div>
    </div>
  )
}
