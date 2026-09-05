import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, error, helperText, required, className, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
    const generatedId = useId()
    const fieldId = id ?? generatedId
    const messageId = `${fieldId}-${error ? 'error' : 'helper'}`
    const describedBy = [ariaDescribedBy, (error || helperText) ? messageId : null]
      .filter(Boolean)
      .join(' ') || undefined

    return (
      <div className={cn('field-group', error && 'has-error')}>
        {label && (
          <label className="field-label" htmlFor={fieldId}>
            {label}
            {required && <span className="field-required" aria-hidden="true">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={fieldId}
          className={cn('field-input', error && 'has-error', className)}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...props}
        />
        {error && <span id={messageId} className="field-error-msg" role="alert">{error}</span>}
        {!error && helperText && <span id={messageId} className="field-helper">{helperText}</span>}
      </div>
    )
  }
)

Input.displayName = 'Input'
