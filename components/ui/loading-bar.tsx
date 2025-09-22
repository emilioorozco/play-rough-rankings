import React from 'react'
import { cn } from '@/lib/utils'

interface LoadingBarProps {
  isLoading: boolean
  className?: string
  height?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'secondary' | 'accent'
}

export function LoadingBar({ 
  isLoading, 
  className,
  height = 'sm',
  color = 'primary'
}: LoadingBarProps) {
  const heightClasses = {
    sm: 'h-0.5',
    md: 'h-1',
    lg: 'h-1.5'
  }

  const colorClasses = {
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    accent: 'bg-accent'
  }

  if (!isLoading) return null

  return (
    <div className={cn('fixed top-0 left-0 right-0 z-50', className)}>
      <div 
        className={cn(
          'w-full',
          heightClasses[height],
          'bg-muted/20'
        )}
      >
        <div 
          className={cn(
            'h-full',
            colorClasses[color],
            'animate-[loading-bar_2s_ease-in-out_infinite]'
          )}
        />
      </div>
    </div>
  )
}

// Add the keyframes to your global CSS or use Tailwind's arbitrary values
// You can add this to your globals.css:
/*
@keyframes loading-bar {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(0%);
  }
  100% {
    transform: translateX(100%);
  }
}
*/
