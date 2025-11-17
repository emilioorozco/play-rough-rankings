import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { announceValidationError, announceErrorCleared, announceToScreenReader } from '@/lib/utils/accessibility'
import { Input } from './input'
import { Label } from './label'
import { Button } from './button'
import { Textarea } from './textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Combobox } from './combobox'
import { Checkbox } from './checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

// Form field wrapper with consistent styling
interface FormFieldProps {
  label?: string
  error?: string
  errorType?: 'client' | 'server'
  required?: boolean
  description?: string
  className?: string
  children: React.ReactNode
  fieldId?: string
}

export function FormField({ 
  label, 
  error, 
  errorType,
  required, 
  description, 
  className,
  children,
  fieldId
}: FormFieldProps) {
  const generatedId = React.useId()
  const id = fieldId || generatedId
  const errorId = `${id}-error`
  const descriptionId = `${id}-description`
  const previousErrorRef = React.useRef<string | undefined>(undefined)

  // Announce errors when they appear or are cleared
  React.useEffect(() => {
    const fieldName = label || 'Field'
    
    // Error appeared
    if (error && !previousErrorRef.current) {
      announceValidationError(fieldName, error)
    }
    // Error cleared
    else if (!error && previousErrorRef.current) {
      announceErrorCleared(fieldName)
    }
    // Error changed
    else if (error && previousErrorRef.current && error !== previousErrorRef.current) {
      announceValidationError(fieldName, error)
    }
    
    previousErrorRef.current = error
  }, [error, label])

  // Clone the child element and add ARIA attributes
  const childWithProps = React.isValidElement(children)
    ? React.cloneElement(children, {
        id,
        'aria-invalid': !!error,
        'aria-describedby': error ? errorId : (description ? descriptionId : undefined),
        'aria-required': required,
      } as any)
    : children

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1" aria-label="required">*</span>}
        </Label>
      )}
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">{description}</p>
      )}
      {childWithProps}
      {error && (
        <div 
          id={errorId}
          role="alert"
          aria-live="polite"
          className={cn(
            "flex items-center gap-2 text-sm text-destructive",
            errorType === 'server' && "font-medium"
          )}
        >
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <span>
            {errorType === 'server' && <span className="font-semibold">Server error: </span>}
            {error}
          </span>
        </div>
      )}
    </div>
  )
}

// Enhanced input component
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  errorType?: 'client' | 'server'
  required?: boolean
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  rightIcon?: React.ReactNode
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, errorType, required, description, icon: Icon, rightIcon, className, onBlur, id: providedId, ...props }, ref) => {
    const generatedId = React.useId()
    const fieldId = providedId || generatedId
    const errorId = `${fieldId}-error`
    const descriptionId = `${fieldId}-description`
    const previousErrorRef = React.useRef<string | undefined>(undefined)

    // Announce errors when they appear or are cleared
    React.useEffect(() => {
      const fieldName = label || 'Field'
      
      // Error appeared
      if (error && !previousErrorRef.current) {
        announceValidationError(fieldName, error)
      }
      // Error cleared
      else if (!error && previousErrorRef.current) {
        announceErrorCleared(fieldName)
      }
      // Error changed
      else if (error && previousErrorRef.current && error !== previousErrorRef.current) {
        announceValidationError(fieldName, error)
      }
      
      previousErrorRef.current = error
    }, [error, label])

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Call custom onBlur handler if provided
      if (onBlur) {
        onBlur(e)
      }
    }

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={fieldId} className="text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-1" aria-label="required">*</span>}
          </Label>
        )}
        {description && (
          <p id={descriptionId} className="text-sm text-muted-foreground">{description}</p>
        )}
        <div className="relative">
          {Icon && (
            <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          )}
          <Input
            ref={ref}
            id={fieldId}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : (description ? descriptionId : undefined)}
            aria-required={required}
            className={cn(
              Icon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-destructive focus-visible:ring-destructive',
              className
            )}
            onBlur={handleBlur}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <div 
            id={errorId}
            role="alert"
            aria-live="polite"
            className={cn(
              "flex items-center gap-2 text-sm text-destructive",
              errorType === 'server' && "font-medium"
            )}
          >
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <span>
              {errorType === 'server' && <span className="font-semibold">Server error: </span>}
              {error}
            </span>
          </div>
        )}
      </div>
    )
  }
)
FormInput.displayName = 'FormInput'

// Enhanced textarea component
interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  errorType?: 'client' | 'server'
  required?: boolean
  description?: string
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, errorType, required, description, className, onBlur, id: providedId, ...props }, ref) => {
    const generatedId = React.useId()
    const fieldId = providedId || generatedId
    const errorId = `${fieldId}-error`
    const descriptionId = `${fieldId}-description`
    const previousErrorRef = React.useRef<string | undefined>(undefined)

    // Announce errors when they appear or are cleared
    React.useEffect(() => {
      const fieldName = label || 'Field'
      
      // Error appeared
      if (error && !previousErrorRef.current) {
        announceValidationError(fieldName, error)
      }
      // Error cleared
      else if (!error && previousErrorRef.current) {
        announceErrorCleared(fieldName)
      }
      // Error changed
      else if (error && previousErrorRef.current && error !== previousErrorRef.current) {
        announceValidationError(fieldName, error)
      }
      
      previousErrorRef.current = error
    }, [error, label])

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      // Call custom onBlur handler if provided
      if (onBlur) {
        onBlur(e)
      }
    }

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={fieldId} className="text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-1" aria-label="required">*</span>}
          </Label>
        )}
        {description && (
          <p id={descriptionId} className="text-sm text-muted-foreground">{description}</p>
        )}
        <Textarea
          ref={ref}
          id={fieldId}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : (description ? descriptionId : undefined)}
          aria-required={required}
          className={cn(
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          onBlur={handleBlur}
          {...props}
        />
        {error && (
          <div 
            id={errorId}
            role="alert"
            aria-live="polite"
            className={cn(
              "flex items-center gap-2 text-sm text-destructive",
              errorType === 'server' && "font-medium"
            )}
          >
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <span>
              {errorType === 'server' && <span className="font-semibold">Server error: </span>}
              {error}
            </span>
          </div>
        )}
      </div>
    )
  }
)
FormTextarea.displayName = 'FormTextarea'

// Enhanced select component
interface FormSelectProps {
  label?: string
  error?: string
  errorType?: 'client' | 'server'
  required?: boolean
  description?: string
  placeholder?: string
  value?: string
  onValueChange?: (value: string) => void
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
  onBlur?: () => void
  options?: Array<{ value: string; label: string }>
  children?: React.ReactNode
  disabled?: boolean
  id?: string
}

export function FormSelect({ 
  label, 
  error, 
  errorType,
  required, 
  description, 
  placeholder,
  value,
  onValueChange,
  onChange,
  onBlur,
  options,
  children,
  disabled,
  id: providedId
}: FormSelectProps) {
  const generatedId = React.useId()
  const fieldId = providedId || generatedId
  const errorId = `${fieldId}-error`
  const descriptionId = `${fieldId}-description`
  const previousValueRef = React.useRef(value)
  const previousErrorRef = React.useRef<string | undefined>(undefined)

  // Announce errors when they appear or are cleared
  React.useEffect(() => {
    const fieldName = label || 'Field'
    
    // Error appeared
    if (error && !previousErrorRef.current) {
      announceValidationError(fieldName, error)
    }
    // Error cleared
    else if (!error && previousErrorRef.current) {
      announceErrorCleared(fieldName)
    }
    // Error changed
    else if (error && previousErrorRef.current && error !== previousErrorRef.current) {
      announceValidationError(fieldName, error)
    }
    
    previousErrorRef.current = error
  }, [error, label])

  const handleValueChange = (newValue: string) => {
    if (onValueChange) {
      onValueChange(newValue)
    }
    if (onChange) {
      // Create a synthetic event for compatibility
      const syntheticEvent = {
        target: { value: newValue }
      } as React.ChangeEvent<HTMLSelectElement>
      onChange(syntheticEvent)
    }
    
    // Trigger blur event when value changes (select closes after selection)
    if (onBlur && previousValueRef.current !== newValue) {
      // Use setTimeout to ensure the value change is processed first
      setTimeout(() => {
        onBlur()
      }, 0)
    }
    previousValueRef.current = newValue
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={fieldId} className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1" aria-label="required">*</span>}
        </Label>
      )}
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">{description}</p>
      )}
      <Select 
        value={value} 
        onValueChange={handleValueChange} 
        disabled={disabled}
      >
        <SelectTrigger 
          id={fieldId}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : (description ? descriptionId : undefined)}
          aria-required={required}
          className={cn(
            error && 'border-destructive focus:ring-destructive'
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options ? (
            options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))
          ) : (
            children
          )}
        </SelectContent>
      </Select>
      {error && (
        <div 
          id={errorId}
          role="alert"
          aria-live="polite"
          className={cn(
            "flex items-center gap-2 text-sm text-destructive",
            errorType === 'server' && "font-medium"
          )}
        >
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <span>
            {errorType === 'server' && <span className="font-semibold">Server error: </span>}
            {error}
          </span>
        </div>
      )}
    </div>
  )
}

// Combobox component for searchable selects
interface FormComboboxProps {
  label?: string
  error?: string
  required?: boolean
  description?: string
  placeholder?: string
  value?: string
  onValueChange?: (value: string) => void
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  options: Array<{ value: string; label: string }>
  disabled?: boolean
}

export function FormCombobox({ 
  label, 
  error, 
  required, 
  description,
  placeholder,
  value,
  onValueChange,
  onChange,
  options,
  disabled
}: FormComboboxProps) {
  const handleValueChange = (newValue: string) => {
    if (onValueChange) {
      onValueChange(newValue)
    }
    if (onChange) {
      // Create a synthetic event for compatibility
      const syntheticEvent = {
        target: { value: newValue }
      } as React.ChangeEvent<HTMLInputElement>
      onChange(syntheticEvent)
    }
  }

  return (
    <FormField label={label} error={error} required={required} description={description}>
      <Combobox 
        value={value} 
        onValueChange={handleValueChange} 
        options={options}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          error && 'border-destructive'
        )}
      />
    </FormField>
  )
}

// Enhanced checkbox component
interface FormCheckboxProps {
  label?: string
  error?: string
  required?: boolean
  description?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  id?: string
}

export function FormCheckbox({ 
  label, 
  error, 
  required, 
  description, 
  checked,
  onCheckedChange,
  disabled,
  className,
  id: providedId
}: FormCheckboxProps) {
  const generatedId = React.useId()
  const fieldId = providedId || generatedId
  const errorId = `${fieldId}-error`
  const descriptionId = `${fieldId}-description`
  const previousErrorRef = React.useRef<string | undefined>(undefined)

  // Announce errors when they appear or are cleared
  React.useEffect(() => {
    const fieldName = label || 'Checkbox'
    
    // Error appeared
    if (error && !previousErrorRef.current) {
      announceValidationError(fieldName, error)
    }
    // Error cleared
    else if (!error && previousErrorRef.current) {
      announceErrorCleared(fieldName)
    }
    // Error changed
    else if (error && previousErrorRef.current && error !== previousErrorRef.current) {
      announceValidationError(fieldName, error)
    }
    
    previousErrorRef.current = error
  }, [error, label])

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center space-x-2">
        <Checkbox
          id={fieldId}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : (description ? descriptionId : undefined)}
          aria-required={required}
          className={cn(
            error && 'border-destructive data-[state=checked]:bg-destructive'
          )}
        />
        {label && (
          <Label 
            htmlFor={fieldId} 
            className="text-sm font-normal cursor-pointer"
          >
            {label}
            {required && <span className="text-destructive ml-1" aria-label="required">*</span>}
          </Label>
        )}
      </div>
      {description && !error && (
        <p id={descriptionId} className="text-sm text-muted-foreground">{description}</p>
      )}
      {error && (
        <div 
          id={errorId}
          role="alert"
          aria-live="polite"
          className="flex items-center gap-2 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

// Form actions component
interface FormActionsProps {
  onSubmit?: () => void
  onReset?: () => void
  onCancel?: () => void
  isSubmitting?: boolean
  isValid?: boolean
  isDirty?: boolean
  submitLabel?: string
  resetLabel?: string
  cancelLabel?: string
  showReset?: boolean
  showCancel?: boolean
  className?: string
}

export function FormActions({
  onSubmit,
  onReset,
  onCancel,
  isSubmitting = false,
  isValid = true,
  isDirty = false,
  submitLabel = 'Submit',
  resetLabel = 'Reset',
  cancelLabel = 'Cancel',
  showReset = true,
  showCancel = false,
  className
}: FormActionsProps) {
  return (
    <div className={cn('flex items-center gap-3 pt-4', className)}>
      {showCancel && (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {cancelLabel}
        </Button>
      )}
      
      {showReset && (
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          disabled={isSubmitting || !isDirty}
        >
          {resetLabel}
        </Button>
      )}
      
      <Button
        type="submit"
        onClick={onSubmit}
        disabled={isSubmitting || !isValid}
        className="ml-auto"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </div>
  )
}

// Form status component
interface FormStatusProps {
  success?: string
  error?: string
  errorType?: 'client' | 'server'
  className?: string
}

export function FormStatus({ success, error, errorType, className }: FormStatusProps) {
  const previousStatusRef = React.useRef<{ success?: string; error?: string }>({})

  // Announce status changes
  React.useEffect(() => {
    // Success message appeared
    if (success && !previousStatusRef.current.success) {
      announceToScreenReader(`Success: ${success}`, 'polite')
    }
    // Error message appeared
    else if (error && !previousStatusRef.current.error) {
      announceToScreenReader(`Error: ${error}`, 'assertive')
    }
    
    previousStatusRef.current = { success, error }
  }, [success, error])

  if (!success && !error) return null

  return (
    <div 
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'p-4 rounded-lg border',
        success && 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900',
        error && errorType === 'server' && 'bg-destructive/10 border-destructive/30',
        error && errorType !== 'server' && 'bg-destructive/5 border-destructive/20',
        className
      )}
    >
      {success && (
        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
          <CheckCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <span className="font-medium">{success}</span>
        </div>
      )}
      {error && (
        <div className={cn(
          "flex items-center gap-2 text-sm",
          errorType === 'server' ? 'text-destructive' : 'text-destructive/90'
        )}>
          <AlertCircle 
            className={cn(
              "flex-shrink-0",
              errorType === 'server' ? 'h-5 w-5' : 'h-4 w-4'
            )}
            aria-hidden="true"
          />
          <span className={cn(
            errorType === 'server' && 'font-semibold'
          )}>
            {errorType === 'server' && <span className="font-bold">Server error: </span>}
            {error}
          </span>
        </div>
      )}
    </div>
  )
}

// Form wrapper component
interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  onCancel?: () => void
}

export function Form({ title, description, children, className, onCancel, onSubmit, ...props }: FormProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    // Handle Enter key for form submission
    if (e.key === 'Enter' && !e.shiftKey && e.target instanceof HTMLInputElement) {
      // Only submit if not in a textarea
      e.preventDefault()
      if (onSubmit) {
        onSubmit(e as any)
      }
    }
    
    // Handle Escape key for cancel/reset
    if (e.key === 'Escape' && onCancel) {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <form onKeyDown={handleKeyDown} onSubmit={onSubmit} {...props}>
          <div className="space-y-6">
            {children}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// Modal-specific form component (no Card wrapper)
export function ModalForm({ title, description, children, className, onCancel, onSubmit, ...props }: FormProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    // Handle Enter key for form submission
    if (e.key === 'Enter' && !e.shiftKey && e.target instanceof HTMLInputElement) {
      // Only submit if not in a textarea
      e.preventDefault()
      if (onSubmit) {
        onSubmit(e as any)
      }
    }
    
    // Handle Escape key for cancel/reset
    if (e.key === 'Escape' && onCancel) {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <div className={className}>
      {(title || description) && (
        <div className="mb-6">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      )}
      <form onKeyDown={handleKeyDown} onSubmit={onSubmit} {...props}>
        <div className="space-y-6">
          {children}
        </div>
      </form>
    </div>
  )
}

// Standalone form component with modal-like styling (for use outside of modals)
export function StandaloneForm({ title, description, children, className, onCancel, onSubmit, ...props }: FormProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    // Handle Enter key for form submission
    if (e.key === 'Enter' && !e.shiftKey && e.target instanceof HTMLInputElement) {
      // Only submit if not in a textarea
      e.preventDefault()
      if (onSubmit) {
        onSubmit(e as any)
      }
    }
    
    // Handle Escape key for cancel/reset
    if (e.key === 'Escape' && onCancel) {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <div className={className}>
      {(title || description) && (
        <div className="p-6 border-b">
          {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      )}
      <div className="p-6">
        <form onKeyDown={handleKeyDown} onSubmit={onSubmit} {...props}>
          <div className="space-y-4">
            {children}
          </div>
        </form>
      </div>
    </div>
  )
}

// Multi-step form wrapper
interface MultiStepFormProps {
  title?: string
  description?: string
  currentStep: number
  totalSteps: number
  children: React.ReactNode
  className?: string
}

export function MultiStepForm({ 
  title, 
  description, 
  currentStep, 
  totalSteps, 
  children, 
  className 
}: MultiStepFormProps) {
  // Progress goes from 0% to ~90% across steps, leaving room for final submission
  const progress = Math.min((currentStep / totalSteps) * 100 + (100 / totalSteps / 2), 90)
  
  return (
    <Card className={className}>
      <CardHeader>
        {title && <CardTitle>{title}</CardTitle>}
        {description && <CardDescription>{description}</CardDescription>}
        <div className="flex items-center gap-2 pt-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  )
}

// Modal-specific multi-step form component (no Card wrapper, no progress bar - handled by modal header)
export function ModalMultiStepForm({ 
  children, 
  className 
}: MultiStepFormProps) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}
