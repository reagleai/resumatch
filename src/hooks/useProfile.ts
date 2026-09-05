import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getReviewProfileFixture,
  isReviewMode,
  saveReviewProfileFixture,
} from '@/lib/reviewMode'
import type { ProfileState } from '@/types'

/** Supabase row shape for the resumatch_profiles table */
interface ProfileRow {
  id: string
  first_name: string
  last_name: string
  base_resume_html: string
  maxgrowthpct: number
  companynamefallback: string
  roletitlefallback: string
  created_at: string
  updated_at: string
}

/** Convert a Supabase row to the app's ProfileState shape */
function rowToProfile(row: ProfileRow): ProfileState {
  return {
    firstName: row.first_name,
    lastName: row.last_name,
    baseResumeHtml: row.base_resume_html,
    maxgrowthpct: row.maxgrowthpct,
    companynamefallback: row.companynamefallback,
    roletitlefallback: row.roletitlefallback,
  }
}

/** Convert app ProfileState to a Supabase row payload (without id/timestamps) */
function profileToRow(profile: ProfileState) {
  return {
    first_name: profile.firstName,
    last_name: profile.lastName,
    base_resume_html: profile.baseResumeHtml,
    maxgrowthpct: profile.maxgrowthpct,
    companynamefallback: profile.companynamefallback,
    roletitlefallback: profile.roletitlefallback,
    updated_at: new Date().toISOString(),
  }
}

const PROFILE_QUERY_KEY = ['profile'] as const

/**
 * Fetch the current user's profile from Supabase.
 * Since this is a single-user app with a shared anon key,
 * we read the first (and only) row from the profiles table.
 */
async function fetchProfile(): Promise<ProfileState | null> {
  if (import.meta.env.DEV && isReviewMode()) return getReviewProfileFixture()

  const { supabase } = await import('@/lib/supabase')
  const { data, error } = await supabase
    .from('resumatch_profiles')
    .select('first_name, last_name, base_resume_html, maxgrowthpct, companynamefallback, roletitlefallback')
    .limit(1)
    .maybeSingle()

  if (error) {
    if (import.meta.env.DEV) console.error('[useProfile] Fetch error:', error)
    throw new Error('Could not load profile. Please try again.')
  }
  if (!data) return null
  return rowToProfile(data as ProfileRow)
}

/**
 * Upsert the profile: insert if no row exists, update if it does.
 * Uses a fixed UUID so there's always exactly 1 row.
 */
const PROFILE_ID = '00000000-0000-0000-0000-000000000001'

async function upsertProfile(profile: ProfileState): Promise<ProfileState> {
  if (import.meta.env.DEV && isReviewMode()) return saveReviewProfileFixture(profile)

  const { supabase } = await import('@/lib/supabase')
  const payload = {
    id: PROFILE_ID,
    ...profileToRow(profile),
  }

  const { data, error } = await supabase
    .from('resumatch_profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('first_name, last_name, base_resume_html, maxgrowthpct, companynamefallback, roletitlefallback')
    .single()

  if (error) {
    if (import.meta.env.DEV) console.error('[useProfile] Upsert error:', error)
    throw new Error('Could not save profile. Please try again.')
  }
  return rowToProfile(data as ProfileRow)
}

/**
 * React Query hook to fetch the profile.
 */
export function useProfileQuery() {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: fetchProfile,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  })
}

/**
 * React Query mutation to save/upsert the profile.
 */
export function useProfileMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: upsertProfile,
    onSuccess: (savedProfile) => {
      // Update the query cache with the saved data
      queryClient.setQueryData(PROFILE_QUERY_KEY, savedProfile)
    },
  })
}
