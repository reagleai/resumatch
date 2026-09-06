// ============================================================================
// Resume template registry (frontend).
//
// - "base" (Classic) is the template the generator actually uses. Its preview is
//   the real base_resume.html with PII (name + contact) stripped, and we surface
//   the per-point character limits it is calibrated to (these are enforced
//   server-side by templateBudget.ts / splitSections so the one-pager can't
//   overflow).
// - "modern" / "compact" are restyled variants on the same element/class
//   skeleton, shown for preview. Their content is neutral placeholder (no PII).
// ============================================================================

import baseRaw from '../../base_resume.html?raw'
import modernRaw from '../templates/modern_resume.html?raw'
import compactRaw from '../templates/compact_resume.html?raw'

export interface TemplateBudgets {
  /** Longest single bullet the one-page layout can hold (visible chars). */
  maxBulletChars: number
  /** Summary paragraph length the layout is calibrated to. */
  summaryChars: number
  /** Longest skills line the layout can hold. */
  maxSkillLineChars: number
}

export interface ResumeTemplate {
  id: 'base' | 'modern' | 'compact'
  name: string
  description: string
  /** 'active' = used by generation today; 'preview' = view-only for now. */
  status: 'active' | 'preview'
  /** Full HTML document used for the eye-icon preview. */
  previewHtml: string
  /** Per-point character limits (only computed for the active base template). */
  budgets?: TemplateBudgets
}

function stripTags(html: string): number {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;?/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim().length
}

function maxOf(nums: number[]): number {
  return nums.length ? Math.max(...nums) : 0
}

/** Measure the per-point character ceilings from a base-structured template. */
function measureBudgets(html: string): TemplateBudgets {
  const bullets = [...html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => stripTags(m[1]))
  const skills = [...html.matchAll(/<p class="skill-line"[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => stripTags(m[1]))
  const summaryMatch = html.match(/<p class="summary"[^>]*>([\s\S]*?)<\/p>/i)
  return {
    maxBulletChars: maxOf(bullets),
    summaryChars: summaryMatch ? stripTags(summaryMatch[1]) : 0,
    maxSkillLineChars: maxOf(skills),
  }
}

export const RESUME_TEMPLATES: ResumeTemplate[] = [
  {
    id: 'base',
    name: 'Classic',
    description: 'Used for every run. Tuned to one A4 page; these limits are enforced.',
    status: 'active',
    previewHtml: baseRaw,
    budgets: measureBudgets(baseRaw),
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Sans-serif layout with accent-coloured section headers.',
    status: 'preview',
    previewHtml: modernRaw,
  },
  {
    id: 'compact',
    name: 'Compact',
    description: 'Denser serif layout that fits more roles on the page.',
    status: 'preview',
    previewHtml: compactRaw,
  },
]
