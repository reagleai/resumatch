import { Check, Loader2, ShieldCheck } from 'lucide-react'
import { RESUME_IMPORT_STAGES, stageIndex } from '@/lib/resumeImport'
import type { ResumeImportReport, ResumeImportStageId } from '@/types'

interface ResumeImportProgressProps {
  /** Non-null while an import is running — drives the live stepper. */
  activeStage: ResumeImportStageId | null
  /** Present once an import has finished — drives the audit summary. */
  report: ResumeImportReport | null
}

/**
 * Shows what the import is doing right now (a per-stage stepper) and, once
 * done, a one-line summary of what the accuracy passes checked and fixed.
 */
export function ResumeImportProgress({ activeStage, report }: ResumeImportProgressProps) {
  if (activeStage) {
    const activeIdx = stageIndex(activeStage)
    return (
      <>
        <span className="sr-only" role="status" aria-live="polite">
          {RESUME_IMPORT_STAGES[activeIdx]?.label}
        </span>
        <ol className="import-stepper" aria-label="Resume import progress">
          {RESUME_IMPORT_STAGES.map((stage, idx) => {
            const state = idx < activeIdx ? 'done' : idx === activeIdx ? 'active' : 'pending'
            return (
              <li key={stage.id} className={`import-step is-${state}`} aria-current={state === 'active' ? 'step' : undefined}>
                <span className="import-step-icon" aria-hidden="true">
                  {state === 'done' && <Check size={13} />}
                  {state === 'active' && <Loader2 size={13} className="import-spin" />}
                </span>
                <span className="import-step-body">
                  <span className="import-step-label">{stage.label}</span>
                </span>
              </li>
            )
          })}
        </ol>
      </>
    )
  }

  if (!report) return null

  // ── Post-import audit summary ─────────────────────────────────────────────
  const lastAudit = report.audits[report.audits.length - 1]
  const confidencePct = lastAudit ? Math.round(lastAudit.confidence * 100) : null
  const totalCorrections = report.audits.reduce((sum, a) => sum + a.correctionsMade.length, 0)
  const toCheck = lastAudit
    ? [
        ...lastAudit.missingFacts.map((f) => ({ kind: 'Missing', text: f })),
        ...lastAudit.unsupportedFacts.map((f) => ({ kind: 'Unverified', text: f })),
      ]
    : []

  return (
    <div className="import-summary" role="status">
      <div className="import-summary-head">
        <ShieldCheck size={16} aria-hidden="true" />
        <span>
          Imported {report.pages} page{report.pages === 1 ? '' : 's'} · {report.reviewPasses} accuracy
          {report.reviewPasses === 1 ? ' check' : ' checks'}
          {totalCorrections > 0 && ` · ${totalCorrections} fix${totalCorrections === 1 ? '' : 'es'} applied`}
        </span>
        {confidencePct !== null && (
          <span
            className={`import-confidence${confidencePct >= 85 ? ' is-high' : confidencePct >= 60 ? ' is-mid' : ' is-low'}`}
            title="How confident the final check was that the imported text matches your PDF."
          >
            {confidencePct}% match
          </span>
        )}
      </div>

      {toCheck.length > 0 && (
        <div className="import-summary-review">
          <div className="import-summary-review-title">Check before saving</div>
          <ul>
            {toCheck.slice(0, 6).map((item, i) => (
              <li key={i}>
                <span className="import-review-kind">{item.kind}:</span> {item.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
