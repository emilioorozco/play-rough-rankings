"use client"

import React from 'react'
import { cn } from '@/lib/utils'

interface MultiStepProgressProps {
  currentStep: number
  totalSteps: number
  steps?: string[] // Optional, not used but kept for API compatibility
  isSubmitting?: boolean // Optional, for final step submission state
  className?: string
}

export function MultiStepProgress({ 
  currentStep, 
  totalSteps,
  isSubmitting = false,
  className 
}: MultiStepProgressProps) {
  // Calculate progress percentage matching modal behavior
  // Show progress up to but not including 100%, leaving room for final submission
  // Only reach 100% when submitting the final step
  const isLastStep = currentStep === totalSteps - 1
  const baseProgress = isLastStep && isSubmitting 
    ? 100 
    : Math.min((currentStep / totalSteps) * 100 + (100 / totalSteps / 2), 90)

  return (
    <div className={cn("w-full h-full", className)}>
      {/* Progress bar matching modal style - no rounded corners, stretches full width */}
      <div 
        className="h-full bg-primary transition-all duration-500 ease-out"
        style={{ 
          width: `${baseProgress}%`,
          transition: 'width 500ms ease-out'
        }}
      />
    </div>
  )
}

