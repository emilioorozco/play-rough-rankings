'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Save, AlertCircle, CheckCircle, Clock, FileText, Trash2, RefreshCw } from 'lucide-react'

interface EnhancedFormProps {
  title: string
  description?: string
  children: React.ReactNode
  onSubmit: (e: React.FormEvent) => void
  className?: string
  showAutoSaveStatus?: boolean
  isAutoSaving?: boolean
  lastSaved?: Date
  hasUnsavedChanges?: boolean
  hasDraft?: boolean
}

export function EnhancedForm({
  title,
  description,
  children,
  onSubmit,
  className = '',
  showAutoSaveStatus = true,
  isAutoSaving = false,
  lastSaved,
  hasUnsavedChanges = false,
  hasDraft = false,
}: EnhancedFormProps) {
  const formatLastSaved = (date: Date | undefined) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return 'Unknown'
    }
    
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {title}
              {hasDraft && (
                <Badge variant="secondary" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  Draft
                </Badge>
              )}
            </CardTitle>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </div>
          
          {showAutoSaveStatus && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isAutoSaving ? (
                <div className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Saving...</span>
                </div>
              ) : lastSaved ? (
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Saved {formatLastSaved(lastSaved)}</span>
                </div>
              ) : hasUnsavedChanges ? (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-yellow-500" />
                  <span>Unsaved changes</span>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          {children}
        </form>
      </CardContent>
    </Card>
  )
}

interface EnhancedFormActionsProps {
  onSubmit: () => void
  onReset?: () => void
  onCancel?: () => void
  onSaveDraft?: () => void
  onClearDraft?: () => void
  isSubmitting?: boolean
  isValid?: boolean
  isDirty?: boolean
  hasUnsavedChanges?: boolean
  hasDraft?: boolean
  submitLabel?: string
  resetLabel?: string
  cancelLabel?: string
  saveDraftLabel?: string
  clearDraftLabel?: string
  showDraftActions?: boolean
  className?: string
}

export function EnhancedFormActions({
  onSubmit,
  onReset,
  onCancel,
  onSaveDraft,
  onClearDraft,
  isSubmitting = false,
  isValid = true,
  isDirty = false,
  hasUnsavedChanges = false,
  hasDraft = false,
  submitLabel = 'Submit',
  resetLabel = 'Reset',
  cancelLabel = 'Cancel',
  saveDraftLabel = 'Save Draft',
  clearDraftLabel = 'Clear Draft',
  showDraftActions = true,
  className = '',
}: EnhancedFormActionsProps) {
  return (
    <div className={`flex flex-col sm:flex-row gap-3 ${className}`}>
      {/* Primary Actions */}
      <div className="flex gap-3">
        <Button
          type="submit"
          onClick={onSubmit}
          disabled={!isValid || isSubmitting}
          className="flex-1 sm:flex-none"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            submitLabel
          )}
        </Button>
        
        {onReset && (
          <Button
            type="button"
            variant="outline"
            onClick={onReset}
            disabled={isSubmitting || !isDirty}
          >
            {resetLabel}
          </Button>
        )}
        
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </Button>
        )}
      </div>
      
      {/* Draft Actions */}
      {showDraftActions && (onSaveDraft || onClearDraft) && (
        <div className="flex gap-2 border-l pl-3">
          {onSaveDraft && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSaveDraft}
              disabled={isSubmitting || !hasUnsavedChanges}
              className="flex items-center gap-1"
            >
              <Save className="h-3 w-3" />
              {saveDraftLabel}
            </Button>
          )}
          
          {onClearDraft && hasDraft && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearDraft}
              disabled={isSubmitting}
              className="flex items-center gap-1 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
              {clearDraftLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

interface EnhancedFormStatusProps {
  success?: string
  error?: string
  warning?: string
  info?: string
  className?: string
}

export function EnhancedFormStatus({
  success,
  error,
  warning,
  info,
  className = '',
}: EnhancedFormStatusProps) {
  if (!success && !error && !warning && !info) return null

  return (
    <div className={`space-y-2 ${className}`}>
      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {warning && (
        <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{warning}</AlertDescription>
        </Alert>
      )}
      
      {info && (
        <Alert className="border-blue-200 bg-blue-50 text-blue-800">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{info}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

interface EnhancedMultiStepFormProps {
  title: string
  description?: string
  currentStep: number
  totalSteps: number
  children: React.ReactNode
  onSubmit: (e: React.FormEvent) => void
  className?: string
  showProgress?: boolean
  showAutoSaveStatus?: boolean
  isAutoSaving?: boolean
  lastSaved?: Date
  hasUnsavedChanges?: boolean
  onSaveDraft?: () => void
  onClearDraft?: () => void
  hasDraft?: boolean
}

export function EnhancedMultiStepForm({
  title,
  description,
  currentStep,
  totalSteps,
  children,
  onSubmit,
  className = '',
  showProgress = true,
  showAutoSaveStatus = true,
  isAutoSaving = false,
  lastSaved,
  hasUnsavedChanges = false,
  hasDraft = false,
}: EnhancedMultiStepFormProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {title}
              {hasDraft && (
                <Badge variant="secondary" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  Draft
                </Badge>
              )}
            </CardTitle>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </div>
          
          {showAutoSaveStatus && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isAutoSaving ? (
                <div className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Saving...</span>
                </div>
              ) : lastSaved ? (
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Saved {formatLastSaved(lastSaved)}</span>
                </div>
              ) : hasUnsavedChanges ? (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-yellow-500" />
                  <span>Unsaved changes</span>
                </div>
              ) : null}
            </div>
          )}
        </div>
        
        {showProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStep + 1} of {totalSteps}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          {children}
        </form>
      </CardContent>
    </Card>
  )
}

// Helper function for formatting last saved time
function formatLastSaved(date: Date) {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// Enhanced form field wrapper with auto-save indicators
interface EnhancedFormFieldProps {
  children: React.ReactNode
  label: string
  required?: boolean
  error?: string
  isDirty?: boolean
  hasUnsavedChanges?: boolean
  className?: string
}

export function EnhancedFormField({
  children,
  label,
  required = false,
  error,
  hasUnsavedChanges = false,
  className = '',
}: EnhancedFormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
        {label}
        {required && <span className="text-destructive">*</span>}
        {hasUnsavedChanges && (
          <div className="flex items-center gap-1 text-xs text-yellow-600">
            <Clock className="h-3 w-3" />
            <span>Unsaved</span>
          </div>
        )}
      </label>
      {children}
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  )
}
