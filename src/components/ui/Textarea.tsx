import { forwardRef, useId, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  charCount?: boolean
  monospace?: boolean
  currentLength?: number
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, id, error, helperText, required, charCount, monospace, currentLength = 0, className, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
    const generatedId = useId()
    const fieldId = id ?? generatedId
    const messageId = `${fieldId}-${error ? 'error' : 'helper'}`
    const countId = charCount ? `${fieldId}-count` : null
    const describedBy = [
      ariaDescribedBy,
      (error || helperText) ? messageId : null,
      countId,
    ].filter(Boolean).join(' ') || undefined

    return (
      <div className={cn('field-group', error && 'has-error')}>
        {label && (
          <label className="field-label" htmlFor={fieldId}>
            {label}
            {required && <span className="field-required" aria-hidden="true">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={fieldId}
          className={cn('field-input', 'textarea-input', monospace && 'monospace', error && 'has-error', className)}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...props}
        />
        <div className="field-support-row">
          <div>
            {error && <span id={messageId} className="field-error-msg" role="alert">{error}</span>}
            {!error && helperText && <span id={messageId} className="field-helper">{helperText}</span>}
          </div>
          {charCount && (
            <span id={countId ?? undefined} className="field-char-count">
              {currentLength.toLocaleString()} {currentLength === 1 ? 'character' : 'characters'}
            </span>
          )}
        </div>
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
