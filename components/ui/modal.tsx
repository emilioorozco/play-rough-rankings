import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from './button'
import { StatusMessage } from './status-message'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  error?: string
  success?: string
  autoCloseDelay?: number
  usePortal?: boolean
  // Multi-step props
  isMultiStep?: boolean
  currentStep?: number
  totalSteps?: number
  // Button props
  onSubmit?: () => void
  onCancel?: () => void
  onReset?: () => void
  isSubmitting?: boolean
  isValid?: boolean
  isDirty?: boolean
  submitLabel?: string
  cancelLabel?: string
  resetLabel?: string
  showCancel?: boolean
  showReset?: boolean
  submitVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  // Form integration props
  useFormSubmission?: boolean // If true, onSubmit will be called via form submission instead of button click
  formSubmitHandler?: () => void // Optional custom form submission handler
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  size = 'md',
  showCloseButton = false,
  closeOnOverlayClick = true,
  error,
  success,
  autoCloseDelay = 0,
  usePortal = true,
  // Multi-step props
  isMultiStep = false,
  currentStep = 0,
  totalSteps = 1,
  // Button props
  onSubmit,
  onCancel,
  onReset,
  isSubmitting = false,
  isValid = true,
  isDirty = false,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  resetLabel = 'Reset',
  showCancel = false,
  showReset = false,
  submitVariant = 'default',
  // Form integration props
  useFormSubmission = false,
  formSubmitHandler,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | 'none'>('none')
  const [previousStep, setPreviousStep] = useState(currentStep)
  const [contentHeight, setContentHeight] = useState<number | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Track step changes for slide direction
  useEffect(() => {
    if (isMultiStep && previousStep !== currentStep) {
      if (currentStep > previousStep) {
        setSlideDirection('left') // Moving forward - slide left
      } else if (currentStep < previousStep) {
        setSlideDirection('right') // Moving backward - slide right
      }
      setPreviousStep(currentStep)
      
      // Reset slide direction after animation
      const timer = setTimeout(() => {
        setSlideDirection('none')
      }, 300) // Match animation duration
      
      return () => clearTimeout(timer)
    }
  }, [currentStep, previousStep, isMultiStep])

  // Track content height changes for smooth height transitions
  useEffect(() => {
    if (contentRef.current) {
      const newHeight = contentRef.current.scrollHeight
      setContentHeight(newHeight)
    }
  }, [children, success, error])

  // Prevent body scroll when modal is open and handle escape key
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }
      
      document.addEventListener('keydown', handleEscape)
      
      return () => {
        document.body.style.overflow = 'unset'
        document.removeEventListener('keydown', handleEscape)
      }
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Auto-close functionality
  const [countdown, setCountdown] = useState(0)
  const [shouldAutoClose, setShouldAutoClose] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Track when form is submitted
  useEffect(() => {
    if (isSubmitting) {
      setHasSubmitted(true)
    }
  }, [isSubmitting])

  // Reset submission state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasSubmitted(false)
    }
  }, [isOpen])

  // Handle countdown timer
  useEffect(() => {
    const shouldStartTimer = () => {
      if (!isOpen) return false
      if (autoCloseDelay > 0) return true // Explicit delay
      if (autoCloseDelay === -1 && hasSubmitted) return true // Auto-close after submission
      return false
    }

    if (shouldStartTimer()) {
      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      
      const delay = autoCloseDelay > 0 ? autoCloseDelay : 4 // Use custom delay or default 4 seconds for submission-based
      setCountdown(delay)
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current)
              timerRef.current = null
            }
            setShouldAutoClose(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }
    } else {
      // Clear timer when no auto-close or modal closed
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setCountdown(0)
      setShouldAutoClose(false)
    }
  }, [autoCloseDelay, isOpen, hasSubmitted, success, error])

  // Handle auto-close when countdown reaches 0
  useEffect(() => {
    if (shouldAutoClose) {
      onClose()
      setShouldAutoClose(false)
    }
  }, [shouldAutoClose, onClose])

  // Clean up countdown state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCountdown(0)
      setShouldAutoClose(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm mx-4 sm:mx-6',
    md: 'max-w-md mx-4 sm:mx-6',
    lg: 'max-w-lg mx-4 sm:mx-6',
    xl: 'max-w-xl mx-4 sm:mx-6',
    full: 'max-w-full mx-4 sm:mx-6',
  }

  const currentClasses = cn(
    'w-full bg-background border rounded-lg shadow-lg animate-slide-in focus:outline-none',
    sizeClasses[size],
    className
  )


  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  const modalContent = (
    <div 
      className={cn(
        "overflow-y-auto animate-fade-in",
        usePortal 
          ? "fixed inset-0 flex items-center justify-center bg-black/50 p-4" 
          : "relative w-full"
      )}
      style={usePortal ? { zIndex: 50, position: 'fixed' } : {}}
      onClick={usePortal ? handleOverlayClick : undefined}
      role="dialog"
      aria-modal={usePortal ? "true" : "false"}
      aria-labelledby={title ? "modal-title" : undefined}
      aria-describedby={description ? "modal-description" : undefined}
    >
      <div 
        ref={modalRef}
        className={currentClasses}
        style={{
          transition: 'max-height 300ms ease-out',
          maxHeight: contentHeight ? `${contentHeight + 200}px` : '90vh'
        }}
      >
        {(title || description || showCloseButton) && (
          <div className="relative">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex-1">
                {title && (
                  <h2 id="modal-title" className="text-lg font-semibold text-foreground">
                    {title}
                  </h2>
                )}
                {description && (
                  <p id="modal-description" className="text-sm text-muted-foreground mt-1">
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="ml-4 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {/* Multi-step progress bar on top of divider */}
            {isMultiStep && (
              <div className="absolute -bottom-px left-0 right-0 h-1 bg-muted">
                <div 
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ 
                    width: `${(currentStep / totalSteps) * 100}%`,
                    transition: 'width 500ms ease-out'
                  }}
                />
              </div>
            )}
          </div>
        )}
        <div 
          ref={contentRef}
          className="p-6 min-h-[200px] overflow-y-auto overflow-x-visible"
        >
          <div className="space-y-4">
            {/* Auto-close countdown */}
            {autoCloseDelay > 0 && countdown > 0 && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Auto-closing in {countdown}s
                </p>
              </div>
            )}
            
            {/* Multi-step content with slide animation */}
            <div className={cn(
              "relative overflow-x-visible",
              isMultiStep && slideDirection === 'left' && "animate-slide-left",
              isMultiStep && slideDirection === 'right' && "animate-slide-right"
            )}>
              {children}
            </div>
            
            {/* Success/Error messages */}
            {(error || success) && (
              <div className="p-4 rounded-lg border animate-slide-in">
                {success && (
                  <StatusMessage message={success} type="success" />
                )}
                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Button actions */}
            {(onSubmit || onCancel || onReset) && (
              <div className="flex items-center gap-3 pt-6 border-t">
                {showCancel && onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                  >
                    {cancelLabel}
                  </Button>
                )}
                
                {showReset && onReset && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onReset}
                    disabled={isSubmitting || !isDirty}
                  >
                    {resetLabel}
                  </Button>
                )}
                
                {onSubmit && (
                  <Button
                    type="submit"
                    variant={submitVariant}
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
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return usePortal ? createPortal(modalContent, document.body) : modalContent
}

// Specialized modal for forms
interface FormModalProps extends Omit<ModalProps, 'children'> {
  children: React.ReactNode
  formTitle?: string
  formDescription?: string
}

export function FormModal({
  isOpen,
  onClose,
  title,
  description,
  formTitle,
  formDescription,
  children,
  className,
  size = 'lg',
  ...props
}: FormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || formTitle}
      description={description || formDescription}
      className={className}
      size={size}
      {...props}
    >
      {children}
    </Modal>
  )
}

