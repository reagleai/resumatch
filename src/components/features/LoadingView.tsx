import { LOADING_STEPS } from '@/lib/constants'
import { Check, Loader2 } from 'lucide-react'

interface LoadingViewProps {
  currentStep: number
}

export function LoadingView({ currentStep }: LoadingViewProps) {
  const step = LOADING_STEPS[currentStep] || LOADING_STEPS[0]
  const progress = Math.max(8, ((currentStep + 1) / LOADING_STEPS.length) * 100)

  return (
    <div className="generation-loading" aria-busy="true">
      {/* The stepper below carries the same state visually; this is its
          screen-reader equivalent, announced once per step change. */}
      <span className="sr-only" role="status" aria-live="polite">
        Step {currentStep + 1} of {LOADING_STEPS.length}. {step.label}.
      </span>
      <div className="generation-loading-head">
        <strong>{step.label}</strong>
        <span className="generation-step-count">{currentStep + 1} / {LOADING_STEPS.length}</span>
      </div>

      <div className="generation-progress" role="progressbar" aria-label="Generation progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
        <span style={{ width: `${progress}%` }} />
      </div>

      <ol className="generation-steps" aria-hidden="true">
        {LOADING_STEPS.map((loadingStep, index) => {
          const state = index < currentStep ? 'complete' : index === currentStep ? 'current' : 'upcoming'
          return (
            <li key={loadingStep.label} className={`is-${state}`}>
              <span className="generation-step-icon">
                {state === 'complete' ? <Check size={13} /> : state === 'current' ? <Loader2 size={13} /> : index + 1}
              </span>
              <span>{loadingStep.label}</span>
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
