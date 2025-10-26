import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'
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
  required?: boolean
  description?: string
  className?: string
  children: React.ReactNode
}

export function FormField({ 
  label, 
  error, 
  required, 
  description, 
  className,
  children 
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {children}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  )
}

// Enhanced input component
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  required?: boolean
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  rightIcon?: React.ReactNode
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, required, description, icon: Icon, rightIcon, className, ...props }, ref) => {
    return (
      <FormField label={label} error={error} required={required} description={description}>
        <div className="relative">
          {Icon && (
            <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            ref={ref}
            className={cn(
              Icon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-destructive focus-visible:ring-destructive',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {rightIcon}
            </div>
          )}
        </div>
      </FormField>
    )
  }
)
FormInput.displayName = 'FormInput'

// Enhanced textarea component
interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  required?: boolean
  description?: string
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, required, description, className, ...props }, ref) => {
    return (
      <FormField label={label} error={error} required={required} description={description}>
        <Textarea
          ref={ref}
          className={cn(
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          {...props}
        />
      </FormField>
    )
  }
)
FormTextarea.displayName = 'FormTextarea'

// Enhanced select component
interface FormSelectProps {
  label?: string
  error?: string
  required?: boolean
  description?: string
  placeholder?: string
  value?: string
  onValueChange?: (value: string) => void
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options?: Array<{ value: string; label: string }>
  children?: React.ReactNode
  disabled?: boolean
}

export function FormSelect({ 
  label, 
  error, 
  required, 
  description, 
  placeholder,
  value,
  onValueChange,
  onChange,
  options,
  children,
  disabled 
}: FormSelectProps) {
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
  }

  return (
    <FormField label={label} error={error} required={required} description={description}>
      <Select value={value} onValueChange={handleValueChange} disabled={disabled}>
        <SelectTrigger className={cn(
          error && 'border-destructive focus:ring-destructive'
        )}>
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
    </FormField>
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
}

export function FormCheckbox({ 
  label, 
  error, 
  required, 
  description, 
  checked,
  onCheckedChange,
  disabled,
  className 
}: FormCheckboxProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center space-x-2">
        <Checkbox
          id={label}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          className={cn(
            error && 'border-destructive data-[state=checked]:bg-destructive'
          )}
        />
        {label && (
          <Label 
            htmlFor={label} 
            className="text-sm font-normal cursor-pointer"
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
      </div>
      {description && !error && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
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
  className?: string
}

export function FormStatus({ success, error, className }: FormStatusProps) {
  if (!success && !error) return null

  return (
    <div className={cn('p-4 rounded-lg border', className)}>
      {success && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
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
}

export function Form({ title, description, children, className, ...props }: FormProps) {
  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <form {...props}>
          <div className="space-y-6">
            {children}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// Modal-specific form component (no Card wrapper)
export function ModalForm({ title, description, children, className, ...props }: FormProps) {
  return (
    <div className={className}>
      {(title || description) && (
        <div className="mb-6">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      )}
      <form {...props}>
        <div className="space-y-6">
          {children}
        </div>
      </form>
    </div>
  )
}

// Standalone form component with modal-like styling (for use outside of modals)
export function StandaloneForm({ title, description, children, className, ...props }: FormProps) {
  return (
    <div className={className}>
      {(title || description) && (
        <div className="p-6 border-b">
          {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      )}
      <div className="p-6">
        <form {...props}>
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
