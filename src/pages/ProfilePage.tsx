import { useState, useMemo, useEffect, useRef, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { CheckCircle, ChevronDown, Circle, Eye, FileText, Upload } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useToast } from '@/hooks/useToast'
import { useProfileQuery, useProfileMutation } from '@/hooks/useProfile'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { ResumeImportProgress } from '@/components/features/ResumeImportProgress'
import { ResumeDocument } from '@/components/features/ResumeDocument'
import { runResumeImport } from '@/lib/resumeImport'
import type { ProfileState, ResumeImportReport, ResumeImportStageId } from '@/types'
import { DEFAULT_PROFILE } from '@/lib/constants'
import { getReviewParam, isReviewMode } from '@/lib/reviewMode'

const REQUIRED_FIELDS: { key: keyof ProfileState; label: string }[] = [
  { key: 'baseResumeHtml', label: 'Base resume' },
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
]
const MAX_RESUME_BYTES = 4 * 1024 * 1024

const REVIEW_IMPORT_REPORT: ResumeImportReport = {
  pages: 2,
  extractedCharacters: 6842,
  reviewPasses: 2,
  audits: [
    { pass: 1, missingFacts: [], unsupportedFacts: [], correctionsMade: ['Restored one project metric from the source PDF.'], confidence: 0.91 },
    { pass: 2, missingFacts: [], unsupportedFacts: [], correctionsMade: [], confidence: 0.97 },
  ],
}

export function ProfilePage() {
  const initialReviewState = import.meta.env.DEV && isReviewMode() ? getReviewParam('state') : null
  const setProfile = useAppStore((s) => s.setProfile)
  const { toast } = useToast()
  const [advancedOpen, setAdvancedOpen] = useState(initialReviewState === 'advanced')
  const [saved, setSaved] = useState(false)
  const [importStage, setImportStage] = useState<ResumeImportStageId | null>(
    initialReviewState === 'importing' ? 'audit-1' : null
  )
  const [importError, setImportError] = useState(
    initialReviewState === 'import-error' ? 'This PDF could not be read. Choose a text-based PDF and try again.' : ''
  )
  const [importReport, setImportReport] = useState<ResumeImportReport | null>(
    initialReviewState === 'import-complete' ? REVIEW_IMPORT_REPORT : null
  )
  const [previewOpen, setPreviewOpen] = useState(
    import.meta.env.DEV && isReviewMode() && getReviewParam('preview') === '1'
  )
  // Object URL of the PDF the user uploaded THIS session, so the eye icon can
  // show their exact original resume. Null after a reload (object URLs don't
  // persist) — the preview then falls back to the structured HTML.
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isImporting = importStage !== null

  // ── Supabase data fetching via React Query ──────────────────
  const {
    data: remoteProfile,
    isLoading: isFetching,
    isError: isFetchError,
  } = useProfileQuery()
  const pageIsFetching = isFetching || initialReviewState === 'loading'
  const pageIsFetchError = isFetchError || initialReviewState === 'fetch-error'

  const profileMutation = useProfileMutation()

  // Determine the initial form values: remote data → defaults
  const initialValues: ProfileState = remoteProfile ?? DEFAULT_PROFILE

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<ProfileState>({
    defaultValues: initialValues,
  })

  // When remote data arrives, reset the form with fetched values
  // and sync to the Zustand store so the generator page sees them
  useEffect(() => {
    if (remoteProfile) {
      reset(remoteProfile)
      setProfile(remoteProfile)
    }
  }, [remoteProfile, reset, setProfile])

  // Revoke the previous uploaded-PDF object URL when it changes or on unmount.
  useEffect(() => {
    if (!pdfPreviewUrl) return
    return () => URL.revokeObjectURL(pdfPreviewUrl)
  }, [pdfPreviewUrl])

  const watchedValues = watch()

  const requiredItems = useMemo(() => {
    return REQUIRED_FIELDS.map(({ key, label }) => {
      const value = watchedValues[key]
      return {
        key,
        label,
        complete: typeof value === 'string' && Boolean(value.trim()),
      }
    })
  }, [watchedValues])

  const completedRequiredItems = requiredItems.filter((item) => item.complete).length
  const completeness = Math.round((completedRequiredItems / REQUIRED_FIELDS.length) * 100)

  const onSubmit = (data: ProfileState) => {
    const normalized: ProfileState = {
      ...data,
      maxgrowthpct: Number(data.maxgrowthpct) || 8,
      companynamefallback: data.companynamefallback || 'unknown-company',
      roletitlefallback: data.roletitlefallback || 'target-role',
    }

    // Save to Zustand (for immediate in-app use)
    setProfile(normalized)

    // Save to Supabase via React Query mutation
    profileMutation.mutate(normalized, {
      onSuccess: () => {
        toast('Profile saved! Ready to generate resumes.', 'success')
        setSaved(true)
        setTimeout(() => setSaved(false), 1500)
      },
      onError: (err) => {
        if (import.meta.env.DEV) console.error('[ProfilePage] Save error:', err)
        toast('Save failed. Please check your connection and try again.', 'error')
      },
    })
  }

  const resumeLength = watchedValues.baseResumeHtml?.length || 0
  const isSaving = profileMutation.isPending
  const hasResume = resumeLength > 0

  const importResume = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setImportError('Please choose a PDF resume.')
      return
    }
    if (file.size > MAX_RESUME_BYTES) {
      setImportError('Resume PDF is too large. Maximum size is 4 MB.')
      return
    }

    setImportError('')
    setImportReport(null)
    setImportStage('reading')
    try {
      // Browser extracts the text, then the server streams each stage back
      // (extract → audit 1 → audit 2 → render); setImportStage drives the UI.
      const result = await runResumeImport(file, setImportStage)

      setValue('firstName', result.firstName || '', { shouldDirty: true, shouldValidate: true })
      setValue('lastName', result.lastName || '', { shouldDirty: true, shouldValidate: true })
      setValue('baseResumeHtml', result.baseResumeHtml, { shouldDirty: true, shouldValidate: true })
      clearErrors(['firstName', 'lastName', 'baseResumeHtml'])
      setImportReport(result.report)
      // Keep the exact uploaded PDF for the eye-icon preview (old URL is
      // revoked by the cleanup effect when this value changes).
      setPdfPreviewUrl(URL.createObjectURL(file))
      toast('Resume imported and verified twice. Save your profile to continue.', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Resume import failed.'
      setImportError(message)
      toast(`Resume import failed: ${message.substring(0, 90)}`, 'error')
    } finally {
      setImportStage(null)
    }
  }

  // ── Loading skeleton ─────────────────────────────────────────
  if (pageIsFetching) {
    return (
      <section
        className="app-page profile-page profile-page-loading"
        aria-labelledby="profile-loading-title"
        aria-busy="true"
      >
        <h1 id="profile-loading-title" className="sr-only">Your Profile</h1>
        <span className="sr-only" role="status">Loading profile…</span>

        <header className="app-page-header page-header profile-page-header" aria-hidden="true">
          <div className="page-header-copy">
            <Skeleton variant="heading" width="220px" />
            <Skeleton variant="text" width="320px" />
          </div>
        </header>

        <div className="profile-layout" aria-hidden="true">
          <div className="profile-main">
            <div className="profile-section profile-skeleton-section">
              <Skeleton variant="text" width="25%" height="12px" />
              <Skeleton variant="custom" height="176px" />
            </div>
            <div className="profile-section profile-skeleton-section">
              <Skeleton variant="text" width="20%" height="12px" />
              <div className="profile-field-row">
                <Skeleton variant="custom" height="48px" />
                <Skeleton variant="custom" height="48px" />
              </div>
            </div>
            <div className="profile-section profile-skeleton-section">
              <Skeleton variant="custom" height="52px" />
            </div>
          </div>
          <aside className="profile-readiness profile-readiness-skeleton">
            <Skeleton variant="heading" width="70%" />
            <Skeleton variant="text" height="6px" />
            <Skeleton variant="text" width="82%" />
            <Skeleton variant="text" width="75%" />
            <Skeleton variant="text" width="78%" />
            <Skeleton variant="custom" height="48px" />
          </aside>
        </div>
      </section>
    )
  }

  // Register the name fields first so validation still focuses the first
  // visible identity field when several required values are missing.
  const firstNameField = register('firstName', {
    required: 'This field is required',
    maxLength: { value: 100, message: 'Max 100 characters' },
  })
  const lastNameField = register('lastName', {
    required: 'This field is required',
    maxLength: { value: 100, message: 'Max 100 characters' },
  })
  const baseResumeField = register('baseResumeHtml', {
    required: 'Upload your current resume PDF',
    maxLength: { value: 500_000, message: 'Resume HTML is too large (max 500KB)' },
  })
  const maxGrowthField = register('maxgrowthpct', {
    min: { value: 1, message: 'Minimum is 1%' },
    max: { value: 100, message: 'Maximum is 100%' },
  })
  const companyFallbackField = register('companynamefallback', {
    maxLength: { value: 200, message: 'Max 200 characters' },
  })
  const roleFallbackField = register('roletitlefallback', {
    maxLength: { value: 200, message: 'Max 200 characters' },
  })

  return (
    <section className="app-page profile-page" aria-labelledby="profile-page-title">
      <header className="app-page-header page-header profile-page-header">
        <div className="page-header-copy">
          <h1 id="profile-page-title" className="page-title">Your Profile</h1>
          <p className="page-description">Set once. Used on every resume generation run.</p>
        </div>
      </header>

      {pageIsFetchError && (
        <div className="profile-alert profile-fetch-error" role="alert">
          Could not load your saved profile. You can still edit below; saving requires a working connection.
        </div>
      )}

      <form
        className="profile-form"
        onSubmit={handleSubmit(onSubmit, (validationErrors) => {
          if (validationErrors.maxgrowthpct || validationErrors.companynamefallback || validationErrors.roletitlefallback) {
            setAdvancedOpen(true)
          }
        })}
        noValidate
        autoComplete="off"
      >
        <div className="profile-layout">
          <div className="profile-main">
            <section
              className="profile-section profile-resume-section"
              aria-labelledby="profile-resume-title"
            >
              <header className="profile-section-header">
                <h2 id="profile-resume-title" className="profile-section-title">Base Resume</h2>
              </header>

              <input type="hidden" {...baseResumeField} />
              <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept="application/pdf,.pdf"
                onChange={importResume}
                tabIndex={-1}
                aria-label="Upload current resume PDF"
              />

              <button
                type="button"
                className={`profile-upload-target resume-upload-card${hasResume ? ' has-resume' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                aria-label={hasResume ? 'Replace current resume PDF' : 'Choose a resume PDF'}
                aria-describedby={`profile-resume-upload-description${errors.baseResumeHtml ? ' profile-resume-error' : ''}`}
                aria-invalid={Boolean(errors.baseResumeHtml)}
              >
                <span className="resume-upload-icon" aria-hidden="true">
                  {hasResume ? <FileText size={24} /> : <Upload size={24} />}
                </span>
                <span className="resume-upload-copy">
                  <span className="resume-upload-title">
                    {hasResume ? 'Current resume is ready' : 'Upload your current resume'}
                  </span>
                  <span id="profile-resume-upload-description" className="resume-upload-description">
                    PDF only, up to 4 MB. Text is extracted in your browser, then placed into the locked
                    base template and checked in two LLM review passes.
                  </span>
                  {hasResume && (
                    <span className="resume-template-status">
                      <CheckCircle size={14} aria-hidden="true" />
                      <span>base_resume.html · {resumeLength.toLocaleString()} characters</span>
                    </span>
                  )}
                </span>
                <span className="profile-upload-cta" aria-hidden="true">
                  {!isImporting && <Upload size={16} />}
                  {isImporting ? 'Importing and checking…' : hasResume ? 'Replace PDF' : 'Choose PDF'}
                </span>
              </button>

              {hasResume && (
                <div className="profile-resume-actions">
                  <button
                    type="button"
                    className="profile-preview-action"
                    onClick={() => setPreviewOpen(true)}
                  >
                    <Eye size={16} aria-hidden="true" />
                    Preview current resume
                  </button>
                </div>
              )}

              {errors.baseResumeHtml?.message && (
                <span id="profile-resume-error" className="field-error-msg" role="alert">{errors.baseResumeHtml.message}</span>
              )}
              {importError && (
                <div className="resume-import-message error" role="alert">{importError}</div>
              )}

              <ResumeImportProgress activeStage={importStage} report={importReport} />
            </section>

            <section
              className="profile-section profile-identity-section"
              aria-labelledby="profile-identity-title"
            >
              <header className="profile-section-header">
                <h2 id="profile-identity-title" className="profile-section-title">Identity</h2>
              </header>
              <div className="profile-field-row">
                <Input
                  id="input-firstName"
                  label="First Name"
                  required
                  placeholder="e.g. Ajay"
                  error={errors.firstName?.message}
                  {...firstNameField}
                />
                <Input
                  id="input-lastName"
                  label="Last Name"
                  required
                  placeholder="e.g. Sharma"
                  error={errors.lastName?.message}
                  {...lastNameField}
                />
              </div>
            </section>

            <section className="profile-section profile-advanced-section">
              <h2 className="profile-disclosure-heading">
                <button
                  id="advanced-settings-toggle"
                  type="button"
                  className={`profile-disclosure${advancedOpen ? ' is-open' : ''}`}
                  onClick={() => setAdvancedOpen((value) => !value)}
                  aria-expanded={advancedOpen}
                  aria-controls="advanced-settings-panel"
                >
                  <span>Advanced Settings</span>
                  <ChevronDown size={18} className="profile-disclosure-icon" aria-hidden="true" />
                </button>
              </h2>

              <div
                id="advanced-settings-panel"
                className="profile-advanced-panel"
                role="region"
                aria-labelledby="advanced-settings-toggle"
                hidden={!advancedOpen}
              >
                <div className="profile-advanced-fields">
                  <div className="profile-field-row">
                    <Input
                      id="input-maxgrowthpct"
                      label="Max Growth %"
                      type="number"
                      helperText="How aggressively the AI can expand resume content."
                      error={errors.maxgrowthpct?.message}
                      {...maxGrowthField}
                    />
                    <Input
                      id="input-companynamefallback"
                      label="Company Name Fallback"
                      helperText="Used if JD doesn't mention company name."
                      error={errors.companynamefallback?.message}
                      {...companyFallbackField}
                    />
                  </div>
                  <Input
                    id="input-roletitlefallback"
                    label="Role Title Fallback"
                    helperText="Used if JD doesn't mention role title."
                    error={errors.roletitlefallback?.message}
                    {...roleFallbackField}
                  />
                </div>
              </div>
            </section>
          </div>

          <aside className="profile-readiness" aria-labelledby="profile-readiness-title">
            <div className={`profile-readiness-card${completeness === 100 ? ' is-complete' : ''}`}>
              <div className="profile-readiness-header">
                <h2 id="profile-readiness-title">Profile readiness</h2>
                <span className="profile-readiness-count">
                  {completedRequiredItems}/{REQUIRED_FIELDS.length}
                </span>
              </div>

              <div
                className="profile-progress"
                role="progressbar"
                aria-valuenow={completeness}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Profile completeness"
              >
                <span className="profile-progress-value" style={{ width: `${completeness}%` }} />
              </div>

              <p id="profile-readiness-summary" className="profile-readiness-summary">
                {completeness === 100
                  ? 'Profile complete. You are ready to generate resumes.'
                  : 'Complete the required items before generating a resume.'}
              </p>

              <ul className="profile-checklist">
                {requiredItems.map((item) => (
                  <li key={item.key} className={item.complete ? 'is-complete' : 'is-required'}>
                    {item.complete
                      ? <CheckCircle size={18} aria-hidden="true" />
                      : <Circle size={18} aria-hidden="true" />}
                    <span className="profile-checklist-label">{item.label}</span>
                    <span className="profile-checklist-state">
                      {item.complete ? 'Complete' : 'Required'}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="profile-actions-wrapper profile-readiness-actions">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={isSaving}
                  disabled={isSaving || isImporting}
                  className={`profile-save-button${saved ? ' is-saved' : ''}`}
                  style={saved ? { background: 'var(--color-success)', pointerEvents: 'none' } : undefined}
                  aria-describedby="profile-readiness-summary"
                >
                  {saved ? 'Saved ✓' : isSaving ? 'Saving…' : 'Save Profile'}
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </form>

      {/* Resume preview — the exact uploaded PDF when available this session,
          otherwise the structured base_resume.html result. */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={pdfPreviewUrl ? 'Your uploaded resume (original PDF)' : 'Current resume preview'}
      >
        {pdfPreviewUrl ? (
          <iframe
            title="Your uploaded resume"
            src={pdfPreviewUrl}
            className="profile-preview-frame profile-preview-frame-pdf"
          />
        ) : (
          <ResumeDocument
            title="Current resume preview"
            html={watchedValues.baseResumeHtml || ''}
          />
        )}
      </Modal>
    </section>
  )
}
