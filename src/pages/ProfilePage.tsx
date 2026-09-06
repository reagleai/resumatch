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
import { readableError } from '@/lib/utils'
import type { ProfileState, ResumeImportReport, ResumeImportStageId } from '@/types'
import { DEFAULT_PROFILE } from '@/lib/constants'
import { createReviewImportFixture, getReviewParam, isReviewMode, REVIEW_IMPORT_REPORT } from '@/lib/reviewMode'

const REQUIRED_FIELDS: { key: keyof ProfileState; label: string }[] = [
  { key: 'baseResumeHtml', label: 'Base resume' },
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
]
const MAX_RESUME_BYTES = 4 * 1024 * 1024

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
    initialReviewState === 'import-error' ? 'No readable text found. Upload a text-based PDF, not a scan.' : ''
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
    shouldFocusError: false,
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
        toast('Profile saved', 'success')
        setSaved(true)
        setTimeout(() => setSaved(false), 1500)
      },
      onError: (err) => {
        if (import.meta.env.DEV) console.error('[ProfilePage] Save error:', err)
        toast('Save failed. Check your connection.', 'error')
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
      setImportError('Choose a PDF file.')
      return
    }
    if (file.size > MAX_RESUME_BYTES) {
      setImportError('That PDF is over 4 MB. Choose a smaller file.')
      return
    }

    setImportError('')
    setImportReport(null)
    setImportStage('reading')
    try {
      // Local review mode mirrors each real stage without uploading the
      // reviewer-selected file or contacting a production service.
      const result = import.meta.env.DEV && isReviewMode()
        ? await createReviewImportFixture(setImportStage)
        : await runResumeImport(file, setImportStage)

      setValue('firstName', result.firstName || '', { shouldDirty: true, shouldValidate: true })
      setValue('lastName', result.lastName || '', { shouldDirty: true, shouldValidate: true })
      setValue('baseResumeHtml', result.baseResumeHtml, { shouldDirty: true, shouldValidate: true })
      clearErrors(['firstName', 'lastName', 'baseResumeHtml'])
      setImportReport(result.report)
      // Keep the exact uploaded PDF for the eye-icon preview (old URL is
      // revoked by the cleanup effect when this value changes).
      setPdfPreviewUrl(URL.createObjectURL(file))
      toast('Resume imported. Save to finish.', 'success')
    } catch (error) {
      const message = readableError(
        error instanceof Error ? error.message : 'Import failed. Try again.'
      )
      setImportError(message)
      toast(`Import failed: ${message.substring(0, 90)}`, 'error')
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
        <h1 id="profile-loading-title" className="sr-only">Profile</h1>
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
    required: 'Enter your first name',
    maxLength: { value: 100, message: 'Max 100 characters' },
  })
  const lastNameField = register('lastName', {
    required: 'Enter your last name',
    maxLength: { value: 100, message: 'Max 100 characters' },
  })
  const baseResumeField = register('baseResumeHtml', {
    required: 'Upload your resume PDF',
    maxLength: { value: 500_000, message: 'Resume is too large (max 500 KB)' },
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
          <h1 id="profile-page-title" className="page-title">Profile</h1>
          {!hasResume && (
            <p className="page-description">Set up once. Every run starts from this.</p>
          )}
        </div>
      </header>

      {pageIsFetchError && (
        <div className="profile-alert profile-fetch-error" role="alert">
          Couldn't load your saved profile. You can still edit below, but saving needs a connection.
        </div>
      )}

      <form
        className="profile-form"
        onSubmit={handleSubmit(onSubmit, (validationErrors) => {
          if (validationErrors.baseResumeHtml) {
            document.querySelector<HTMLButtonElement>('.profile-upload-target')?.focus()
            document.querySelector('.profile-resume-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            return
          }
          if (validationErrors.firstName) {
            document.querySelector<HTMLInputElement>('#input-firstName')?.focus()
            return
          }
          if (validationErrors.lastName) {
            document.querySelector<HTMLInputElement>('#input-lastName')?.focus()
            return
          }
          if (validationErrors.maxgrowthpct || validationErrors.companynamefallback || validationErrors.roletitlefallback) {
            setAdvancedOpen(true)
            requestAnimationFrame(() => {
              const id = validationErrors.maxgrowthpct
                ? '#input-maxgrowthpct'
                : validationErrors.companynamefallback
                  ? '#input-companynamefallback'
                  : '#input-roletitlefallback'
              document.querySelector<HTMLInputElement>(id)?.focus()
            })
          }
        })}
        noValidate
      >
        <div className="profile-layout">
          <div className="profile-main">
            <section
              className="profile-section profile-resume-section"
              aria-labelledby="profile-resume-title"
            >
              <header className="profile-section-header">
                <h2 id="profile-resume-title" className="profile-section-title">Base resume</h2>
              </header>

              <input type="hidden" {...baseResumeField} />
              <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept="application/pdf,.pdf"
                onChange={importResume}
                tabIndex={-1}
                aria-label="Resume PDF"
              />

              <button
                type="button"
                className={`profile-upload-target resume-upload-card${hasResume ? ' has-resume' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                aria-label={hasResume ? 'Replace PDF' : 'Choose PDF'}
                aria-describedby={`profile-resume-upload-description${errors.baseResumeHtml ? ' profile-resume-error' : ''}${importError ? ' profile-import-error' : ''}`}
                aria-invalid={Boolean(errors.baseResumeHtml || importError)}
              >
                <span className="resume-upload-icon" aria-hidden="true">
                  {hasResume ? <FileText size={24} /> : <Upload size={24} />}
                </span>
                <span className="resume-upload-copy">
                  <span className="resume-upload-title">
                    {hasResume ? 'Base resume saved' : 'Upload your resume'}
                  </span>
                  <span id="profile-resume-upload-description" className="resume-upload-description">
                    {hasResume
                      ? `Locked one-page template · ${resumeLength.toLocaleString()} characters`
                      : "Text-based PDF, up to 4 MB. Scans can't be read."}
                  </span>
                </span>
                <span className="profile-upload-cta" aria-hidden="true">
                  {!isImporting && <Upload size={16} />}
                  {isImporting ? 'Importing…' : hasResume ? 'Replace PDF' : 'Choose PDF'}
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
                    Preview
                  </button>
                </div>
              )}

              {errors.baseResumeHtml?.message && (
                <span id="profile-resume-error" className="field-error-msg" role="alert">{errors.baseResumeHtml.message}</span>
              )}
              {importError && (
                <div id="profile-import-error" className="resume-import-message error" role="alert">{importError}</div>
              )}

              <ResumeImportProgress activeStage={importStage} report={importReport} />
            </section>

            <section
              className="profile-section profile-identity-section"
              aria-labelledby="profile-identity-title"
            >
              <header className="profile-section-header">
                <h2 id="profile-identity-title" className="profile-section-title">Name</h2>
              </header>
              <div className="profile-field-row">
                <Input
                  id="input-firstName"
                  label="First name"
                  required
                  placeholder="Ajay"
                  autoComplete="given-name"
                  error={errors.firstName?.message}
                  {...firstNameField}
                />
                <Input
                  id="input-lastName"
                  label="Last name"
                  required
                  placeholder="Sharma"
                  autoComplete="family-name"
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
                  <span>Advanced</span>
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
                      label="Max growth %"
                      type="number"
                      min={1}
                      max={100}
                      helperText="Soft limit on how much longer rewritten text may run."
                      error={errors.maxgrowthpct?.message}
                      {...maxGrowthField}
                    />
                    <Input
                      id="input-companynamefallback"
                      label="Company fallback"
                      helperText="Used when the job description names no company."
                      error={errors.companynamefallback?.message}
                      {...companyFallbackField}
                    />
                  </div>
                  <Input
                    id="input-roletitlefallback"
                    label="Role fallback"
                    helperText="Used when the job description names no role."
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

              {completeness < 100 && (
                <p id="profile-readiness-summary" className="profile-readiness-summary">
                  Add the missing items to start generating.
                </p>
              )}

              <ul className="profile-checklist">
                {requiredItems.map((item) => (
                  <li key={item.key} className={item.complete ? 'is-complete' : 'is-required'}>
                    {item.complete
                      ? <CheckCircle size={18} aria-hidden="true" />
                      : <Circle size={18} aria-hidden="true" />}
                    <span className="profile-checklist-label">{item.label}</span>
                    <span className="profile-checklist-state">
                      {item.complete ? 'Added' : 'Missing'}
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
                  disabled={isSaving || isImporting || saved}
                  className={`profile-save-button${saved ? ' is-saved' : ''}`}
                  style={saved ? { background: 'var(--color-success)' } : undefined}
                  aria-describedby={completeness < 100 ? 'profile-readiness-summary' : undefined}
                >
                  {saved ? 'Saved' : isSaving ? 'Saving…' : 'Save'}
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
        title={pdfPreviewUrl ? 'Your uploaded PDF' : 'Base resume'}
      >
        {pdfPreviewUrl ? (
          <iframe
            title="Your uploaded PDF"
            src={pdfPreviewUrl}
            className="profile-preview-frame profile-preview-frame-pdf"
          />
        ) : (
          <ResumeDocument
            title="Base resume"
            html={watchedValues.baseResumeHtml || ''}
          />
        )}
      </Modal>
    </section>
  )
}
