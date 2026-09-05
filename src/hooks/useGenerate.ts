import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/store/appStore'
import { useToast } from '@/hooks/useToast'
import { HISTORY_QUERY_KEY } from '@/hooks/useResumeHistory'
import { LOADING_STEPS } from '@/lib/constants'
import {
  createReviewGenerationFixture,
  isReviewMode,
  prependReviewHistoryFixture,
} from '@/lib/reviewMode'
import type { GenerateInput, Job } from '@/types'

/** Minimum time between consecutive generation starts (ms). */
const COOLDOWN_MS = 5000
/** How often to poll job status (ms). */
const POLL_INTERVAL_MS = 2500
/** Give up polling after this long (ms). */
const MAX_POLL_MS = 600_000 // 10 minutes

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Drives the async generation flow:
 *   POST /api/generate → { jobId }
 *   poll GET /api/jobs/:id until complete | error
 * The backend owns persistence (history row + PDF upload); on completion we
 * just surface the result and invalidate the history query.
 */
export function useGenerate() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const lastCallRef = useRef(0)
  const generationIdRef = useRef(0)

  const generate = useCallback(async () => {
    const genId = ++generationIdRef.current
    const store = useAppStore.getState()
    const { profile, generator } = store

    if (!store.isProfileComplete()) {
      toast('Profile incomplete. Please fill your profile before generating.', 'error')
      return
    }
    if (!generator.jd.trim()) {
      toast('Please enter a job description.', 'error')
      return
    }

    const now = Date.now()
    if (now - lastCallRef.current < COOLDOWN_MS) {
      toast('Please wait a few seconds between generations.', 'info')
      return
    }
    lastCallRef.current = now

    store.setGeneratorStatus('loading')
    store.setLoadingStep(0)

    const payload: GenerateInput = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      baseResumeHtml: profile.baseResumeHtml,
      jd: generator.jd,
      keywords: generator.keywords,
      maxgrowthpct: profile.maxgrowthpct,
      companynamefallback: profile.companynamefallback,
      roletitlefallback: profile.roletitlefallback,
    }

    try {
      if (import.meta.env.DEV && isReviewMode()) {
        for (let step = 1; step < LOADING_STEPS.length; step += 1) {
          await sleep(240)
          if (genId !== generationIdRef.current) return
          store.setLoadingStep(step)
        }

        const { result, history } = await createReviewGenerationFixture(payload)
        if (genId !== generationIdRef.current) return

        store.setGeneratorResult(result)
        store.addHistoryEntry({
          timestamp: result.timestamp,
          companyname: result.companyname,
          roletitle: result.roletitle,
          filename: result.filename,
          html: result.html,
          format: result.format,
          pdfBlobUrl: result.pdfBlobUrl,
        })

        await prependReviewHistoryFixture(history)
        queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY })
        toast(`Resume generated for ${result.roletitle} at ${result.companyname} ✓`, 'success')
        return
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Server returned HTTP ${res.status}`)
      }
      const { jobId } = (await res.json()) as { jobId: string }
      if (!jobId) throw new Error('No job id returned by the server.')

      const start = Date.now()
      // ── Poll loop ──────────────────────────────────────────────
      for (;;) {
        // Discard if a newer generation has superseded this one.
        if (genId !== generationIdRef.current) return
        await sleep(POLL_INTERVAL_MS)
        if (genId !== generationIdRef.current) return
        if (Date.now() - start > MAX_POLL_MS) throw new Error('Generation timed out.')

        const jres = await fetch(`/api/jobs/${jobId}`)
        if (!jres.ok) continue // transient — keep polling
        const job = (await jres.json()) as Job

        store.setLoadingStep(job.step ?? 0)

        if (job.status === 'complete' && job.result) {
          const r = job.result
          const timestamp = new Date()

          store.setGeneratorResult({
            html: '',
            filename: r.filename,
            companyname: r.companyname,
            roletitle: r.roletitle,
            timestamp,
            format: 'pdf',
            pdfBlobUrl: r.pdf_url,
          })

          store.addHistoryEntry({
            timestamp,
            companyname: r.companyname,
            roletitle: r.roletitle,
            filename: r.filename,
            html: '',
            format: 'pdf',
            pdfBlobUrl: r.pdf_url,
          })

          queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY })
          toast(`Resume PDF generated for ${r.roletitle} at ${r.companyname} ✓`, 'success')
          return
        }

        if (job.status === 'error') {
          throw new Error(job.error || 'Generation failed.')
        }
      }
    } catch (err) {
      if (genId !== generationIdRef.current) return
      const msg = (err as Error).message || 'An unexpected error occurred.'
      store.setGeneratorError(msg)
      toast(`Generation failed: ${msg.substring(0, 80)}`, 'error')
    }
  }, [toast, queryClient])

  return { generate }
}
