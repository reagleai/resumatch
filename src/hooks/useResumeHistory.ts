import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  deleteReviewHistoryFixture,
  getReviewHistoryFixture,
  isReviewMode,
} from '@/lib/reviewMode'
import type { SavedResumeWithPdf } from '@/types'

// ── Query Keys ───────────────────────────────────────────────────
export const HISTORY_QUERY_KEY = ['resume-history'] as const

// ── Fetch all resumes (with joined PDF info) ─────────────────────
// The PDF rows live in resumatch_resume_pdfs; alias the embed back to
// `resume_pdfs` so consumers keep reading the same field name.

async function fetchResumeHistory(): Promise<SavedResumeWithPdf[]> {
  if (import.meta.env.DEV && isReviewMode()) return getReviewHistoryFixture()

  const { supabase } = await import('@/lib/supabase')
  const { data, error } = await supabase
    .from('resumatch_resume_history')
    .select(
      `
      id,
      created_at,
      company_name,
      role_title,
      filename,
      resume_html,
      format,
      job_description,
      keywords,
      resume_pdfs:resumatch_resume_pdfs ( id, file_name, file_path, public_url, file_size_bytes )
    `
    )
    .order('created_at', { ascending: false })

  if (error) {
    if (import.meta.env.DEV) console.error('[useResumeHistory] Fetch error:', error)
    throw new Error('Failed to load resume history.')
  }

  return (data ?? []) as SavedResumeWithPdf[]
}

/**
 * Hook: fetch all saved resumes for the history page.
 */
export function useResumeHistoryQuery() {
  return useQuery({
    queryKey: HISTORY_QUERY_KEY,
    queryFn: fetchResumeHistory,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1,
  })
}

// Note: persistence (history row + PDF upload) is now owned by the backend
// pipeline. The frontend only reads, invalidates, and deletes.

// ── Delete a resume ──────────────────────────────────────────────

interface DeletePayload {
  id: string
  pdfFilePath?: string
}

async function deleteResume(payload: DeletePayload): Promise<void> {
  if (import.meta.env.DEV && isReviewMode()) {
    await deleteReviewHistoryFixture(payload.id)
    return
  }

  const { supabase } = await import('@/lib/supabase')
  // Step 1: If a PDF file exists, delete from Storage FIRST
  if (payload.pdfFilePath) {
    const { error: storageError } = await supabase.storage
      .from('resumatch-pdfs')
      .remove([payload.pdfFilePath])

    if (storageError) {
      if (import.meta.env.DEV) console.error('[deleteResume] Storage delete error:', storageError)
      throw new Error('Failed to delete PDF file. Resume was not deleted.')
    }
  }

  // Step 2: Delete history row (CASCADE auto-deletes the resumatch_resume_pdfs row)
  const { error } = await supabase.from('resumatch_resume_history').delete().eq('id', payload.id)

  if (error) {
    if (import.meta.env.DEV) console.error('[deleteResume] DB delete error:', error)
    throw new Error('Failed to delete resume from history.')
  }
}

/**
 * Hook: mutation to delete a resume with optimistic cache removal.
 * Storage file is deleted BEFORE the database row.
 * On failure, the optimistic removal is rolled back.
 */
export function useDeleteResumeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteResume,

    onMutate: async (payload) => {
      // Cancel in-flight fetches
      await queryClient.cancelQueries({ queryKey: HISTORY_QUERY_KEY })

      // Snapshot current cache for rollback
      const previous = queryClient.getQueryData<SavedResumeWithPdf[]>(HISTORY_QUERY_KEY)

      // Optimistically remove the item
      queryClient.setQueryData<SavedResumeWithPdf[]>(HISTORY_QUERY_KEY, (old) =>
        old?.filter((item) => item.id !== payload.id) ?? []
      )

      return { previous }
    },

    onError: (_err, _payload, context) => {
      // Rollback on failure
      if (context?.previous) {
        queryClient.setQueryData(HISTORY_QUERY_KEY, context.previous)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY })
    },
  })
}
