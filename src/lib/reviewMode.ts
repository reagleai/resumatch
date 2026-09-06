import type {
  GenerateInput,
  GeneratorResult,
  ProfileState,
  ResumeImportReport,
  ResumeImportResponse,
  ResumeImportStageId,
  SavedResumePdf,
  SavedResumeWithPdf,
} from '@/types'
import { DEFAULT_PROFILE } from '@/lib/constants'

export type ReviewState = 'default' | 'empty'

const initialSearchParams =
  typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search)

// Vite replaces import.meta.env.DEV at build time. Even if a production URL
// includes ?review=1, this value is always false in the production bundle.
const reviewModeEnabled = import.meta.env.DEV && initialSearchParams.get('review') === '1'
const initialReviewState: ReviewState =
  reviewModeEnabled && initialSearchParams.get('state') === 'empty' ? 'empty' : 'default'

let baseResumeHtmlPromise: Promise<string> | null = null
let reviewProfile: ProfileState | null = null
let reviewHistory: SavedResumeWithPdf[] | null = null

export const REVIEW_IMPORT_REPORT: ResumeImportReport = {
  pages: 2,
  extractedCharacters: 6842,
  reviewPasses: 2,
  audits: [
    { pass: 1, missingFacts: [], unsupportedFacts: [], correctionsMade: ['Restored one project metric from the source PDF.'], confidence: 0.91 },
    { pass: 2, missingFacts: [], unsupportedFacts: [], correctionsMade: [], confidence: 0.97 },
  ],
}

/** Whether this browser session was opened through the development review URL. */
export function isReviewMode(): boolean {
  return reviewModeEnabled
}

/** Named fixture state selected by the initial review URL. */
export function getReviewState(): ReviewState {
  return initialReviewState
}

/** Read an additional review URL parameter without exposing it in production. */
export function getReviewParam(name: string): string | null {
  return reviewModeEnabled ? new URLSearchParams(window.location.search).get(name) : null
}

async function loadBaseResumeHtml(): Promise<string> {
  baseResumeHtmlPromise ??= import('../../base_resume.html?raw').then((module) => module.default)
  return baseResumeHtmlPromise
}

/** Exercise the complete import UI locally without uploading a document. */
export async function createReviewImportFixture(
  onStage: (stage: ResumeImportStageId) => void,
): Promise<ResumeImportResponse> {
  const stages: ResumeImportStageId[] = ['reading', 'extract', 'audit-1', 'audit-2', 'render']
  for (const stage of stages) {
    onStage(stage)
    await new Promise((resolve) => setTimeout(resolve, 220))
  }
  return {
    firstName: 'Alex',
    lastName: 'Morgan',
    baseResumeHtml: await loadBaseResumeHtml(),
    report: REVIEW_IMPORT_REPORT,
  }
}

function cloneProfile(profile: ProfileState): ProfileState {
  return { ...profile }
}

function cloneSavedResume(resume: SavedResumeWithPdf): SavedResumeWithPdf {
  return {
    ...resume,
    resume_pdfs: resume.resume_pdfs.map((pdf) => ({ ...pdf })),
  }
}

function daysAgoIso(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

function pdfSafeText(value: string): string {
  return value
    .replace(/[^\x20-\x7e]/g, '-')
    .replace(/([\\()])/g, '\\$1')
}

/** Build a tiny valid local PDF so review-mode download controls remain usable. */
function createReviewPdfUrl(roleTitle: string, companyName: string): string | null {
  if (typeof Blob === 'undefined' || typeof URL === 'undefined') return null

  const stream = [
    'BT',
    '/F1 20 Tf',
    '72 742 Td',
    '(Resumatch review resume) Tj',
    '/F1 12 Tf',
    '0 -30 Td',
    `(${pdfSafeText(roleTitle)}) Tj`,
    '0 -18 Td',
    `(${pdfSafeText(companyName)}) Tj`,
    '0 -36 Td',
    '(Local development fixture - no backend request was made.) Tj',
    'ET',
  ].join('\n')

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = [0]

  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }))
}

function createPdfFixture(
  resumeId: string,
  filename: string,
  roleTitle: string,
  companyName: string,
  fileSizeBytes: number,
): SavedResumePdf[] {
  const publicUrl = createReviewPdfUrl(roleTitle, companyName)
  if (!publicUrl) return []

  return [
    {
      id: `${resumeId}-pdf`,
      file_name: filename,
      file_path: `review/${filename}`,
      public_url: publicUrl,
      file_size_bytes: fileSizeBytes,
    },
  ]
}

/** A complete local profile, backed by the repository's actual base template. */
export async function getReviewProfileFixture(): Promise<ProfileState> {
  if (!reviewProfile) {
    if (initialSearchParams.get('profile') === 'empty') {
      reviewProfile = { ...DEFAULT_PROFILE }
      return cloneProfile(reviewProfile)
    }
    reviewProfile = {
      firstName: 'Alex',
      lastName: 'Morgan',
      baseResumeHtml: await loadBaseResumeHtml(),
      maxgrowthpct: 8,
      companynamefallback: 'Northstar Labs',
      roletitlefallback: 'Senior Product Manager, AI Products',
    }
  }

  return cloneProfile(reviewProfile)
}

/** Save profile edits in memory for the lifetime of the review page. */
export function saveReviewProfileFixture(profile: ProfileState): ProfileState {
  reviewProfile = cloneProfile(profile)
  return cloneProfile(reviewProfile)
}

async function createDefaultHistory(): Promise<SavedResumeWithPdf[]> {
  const resumeHtml = await loadBaseResumeHtml()
  const records = [
    {
      id: '10000000-0000-4000-8000-000000000001',
      daysAgo: 2,
      companyName: 'Northstar Labs',
      roleTitle: 'Senior Product Manager, AI Products',
      filename: 'alex-morgan-northstar-labs-senior-product-manager.pdf',
      jobDescription:
        'Lead the strategy and delivery of AI-assisted analytics workflows, partner with design and engineering, and improve activation and retention through experimentation.',
      keywords: 'AI products, product strategy, experimentation, analytics, cross-functional leadership',
      fileSizeBytes: 184_320,
    },
    {
      id: '10000000-0000-4000-8000-000000000002',
      daysAgo: 8,
      companyName: 'Meridian Health',
      roleTitle: 'Product Operations Lead',
      filename: 'alex-morgan-meridian-health-product-operations-lead.pdf',
      jobDescription:
        'Build scalable product operations, improve launch quality, synthesize customer feedback, and establish reporting systems for a growing healthcare platform.',
      keywords: 'product operations, voice of customer, launch readiness, reporting, process design',
      fileSizeBytes: 176_128,
    },
    {
      id: '10000000-0000-4000-8000-000000000003',
      daysAgo: 19,
      companyName: 'Harbor Analytics',
      roleTitle: 'Growth Product Manager',
      filename: 'alex-morgan-harbor-analytics-growth-product-manager.pdf',
      jobDescription:
        'Own onboarding and lifecycle improvements for a B2B analytics product using qualitative research, funnel analysis, and structured experiments.',
      keywords: 'growth, onboarding, lifecycle, funnel analysis, customer research',
      fileSizeBytes: 169_984,
    },
  ]

  return records.map((record) => ({
    id: record.id,
    created_at: daysAgoIso(record.daysAgo),
    company_name: record.companyName,
    role_title: record.roleTitle,
    filename: record.filename,
    resume_html: resumeHtml,
    format: 'pdf' as const,
    job_description: record.jobDescription,
    keywords: record.keywords,
    resume_pdfs: createPdfFixture(
      record.id,
      record.filename,
      record.roleTitle,
      record.companyName,
      record.fileSizeBytes,
    ),
  }))
}

/** Review history selected by ?state=empty or the default populated fixture. */
export async function getReviewHistoryFixture(): Promise<SavedResumeWithPdf[]> {
  if (!reviewHistory) {
    reviewHistory = initialReviewState === 'empty' ? [] : await createDefaultHistory()
  }
  return reviewHistory.map(cloneSavedResume)
}

export async function deleteReviewHistoryFixture(id: string): Promise<void> {
  const current = await getReviewHistoryFixture()
  reviewHistory = current.filter((resume) => resume.id !== id)
}

export async function prependReviewHistoryFixture(resume: SavedResumeWithPdf): Promise<void> {
  const current = await getReviewHistoryFixture()
  reviewHistory = [cloneSavedResume(resume), ...current.filter((item) => item.id !== resume.id)].slice(0, 20)
}

function usefulFallback(value: string, placeholder: string, fallback: string): string {
  const normalized = value.trim()
  return normalized && normalized !== placeholder ? normalized : fallback
}

function filenamePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Build a local generated result plus its matching history row. */
export async function createReviewGenerationFixture(input: GenerateInput): Promise<{
  result: GeneratorResult
  history: SavedResumeWithPdf
}> {
  const companyName = usefulFallback(input.companynamefallback, 'unknown-company', 'Northstar Labs')
  const roleTitle = usefulFallback(input.roletitlefallback, 'target-role', 'Senior Product Manager, AI Products')
  const timestamp = new Date()
  const resumeHtml = input.baseResumeHtml.trim() || (await loadBaseResumeHtml())
  const filename = [input.firstName, input.lastName, companyName, roleTitle]
    .map(filenamePart)
    .filter(Boolean)
    .join('-') + '.html'
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `review-${timestamp.getTime()}`

  return {
    result: {
      html: resumeHtml,
      filename,
      companyname: companyName,
      roletitle: roleTitle,
      timestamp,
      format: 'html',
    },
    history: {
      id,
      created_at: timestamp.toISOString(),
      company_name: companyName,
      role_title: roleTitle,
      filename,
      resume_html: resumeHtml,
      format: 'html',
      job_description: input.jd,
      keywords: input.keywords,
      resume_pdfs: [],
    },
  }
}
