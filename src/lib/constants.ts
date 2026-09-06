import type { LoadingStep, ProfileState } from '@/types'

export const WEBHOOK_TIMEOUT_MS = 600_000 // 10 minutes

export const HISTORY_MAX_ITEMS = 20

// Plain-language names for the six backend job stages, collapsed to the five
// steps the job rows report (see api/_lib/jobs.ts → STEP).
export const LOADING_STEPS: LoadingStep[] = [
  { icon: 'zap',          label: 'Starting',                  duration: 0 },
  { icon: 'brain',        label: 'Reading the job description', duration: 0 },
  { icon: 'search',       label: 'Planning the rewrite',      duration: 0 },
  { icon: 'pen-line',     label: 'Rewriting your sections',   duration: 0 },
  { icon: 'check-circle', label: 'Building the PDF',          duration: 0 },
]

/** Resume sections the pipeline rewrites, one LLM call each (refineSection.ts). */
export const REWRITTEN_SECTIONS = ['Summary', 'Experience', 'Projects', 'Skills'] as const

/**
 * Fields a run leaves alone. Header and education never reach the LLM
 * (api/_lib/pipeline/assembleHtml.ts); entry-head values are copied verbatim
 * by the refiner prompts. Bullet wording is rewritten, so metrics are only
 * protected from invention -- they are deliberately not listed here.
 */
export const LOCKED_FIELDS = [
  'Name & contact',
  'Companies & job titles',
  'Dates & locations',
  'Education',
] as const

export const DEFAULT_PROFILE: ProfileState = {
  firstName: '',
  lastName: '',
  baseResumeHtml: '',
  maxgrowthpct: 8,
  companynamefallback: 'unknown-company',
  roletitlefallback: 'target-role',
}

export const KEYBOARD_SHORTCUTS = [
  { keys: ['⌘ / Ctrl', '↵'], label: 'Generate' },
  { keys: ['Alt', '1'], label: 'Generator' },
  { keys: ['Alt', '2'], label: 'Profile' },
  { keys: ['Alt', '3'], label: 'History' },
  { keys: ['Esc'],      label: 'Close dialog' },
]
