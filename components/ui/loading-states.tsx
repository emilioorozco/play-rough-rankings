import React from 'react'
import { Skeleton } from './skeleton'
import { Card, CardContent, CardHeader } from './card'
import { Button } from './button'
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Loading spinner component
export function LoadingSpinner({ 
  size = 'default', 
  className 
}: { 
  size?: 'sm' | 'default' | 'lg'
  className?: string 
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <Loader2 className={cn('animate-spin', sizeClasses[size], className)} />
  )
}

// Full page loading component
export function PageLoading({ 
  message = 'Loading...', 
  description 
}: { 
  message?: string
  description?: string 
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" className="mx-auto" />
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{message}</h2>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Inline loading component
export function InlineLoading({ 
  message = 'Loading...', 
  size = 'default' 
}: { 
  message?: string
  size?: 'sm' | 'default' | 'lg'
}) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <LoadingSpinner size={size} />
      <span className="text-sm">{message}</span>
    </div>
  )
}

// Error component
export function ErrorDisplay({ 
  error, 
  title = 'Something went wrong', 
  description,
  onRetry,
  showDetails = false,
  className 
}: {
  error?: Error | string | null
  title?: string
  description?: string
  onRetry?: () => void
  showDetails?: boolean
  className?: string
}) {
  const errorMessage = typeof error === 'string' ? error : error?.message
  const errorDetails = error instanceof Error ? error.stack : undefined

  return (
    <div className={cn('text-center space-y-4 p-6', className)}>
      <div className="flex justify-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
      </div>
      
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-destructive">{title}</h2>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
        {errorMessage && (
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        )}
      </div>

      {showDetails && errorDetails && (
        <details className="text-left">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            Technical Details
          </summary>
          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
            {errorDetails}
          </pre>
        </details>
      )}

      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  )
}

// Empty state component
export function EmptyState({ 
  title, 
  description, 
  action,
  icon: Icon,
  className 
}: {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}) {
  return (
    <div className={cn('text-center space-y-4 p-6', className)}>
      {Icon && (
        <div className="flex justify-center">
          <Icon className="h-12 w-12 text-muted-foreground" />
        </div>
      )}
      
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>

      {action && (
        <div className="flex justify-center">
          {action}
        </div>
      )}
    </div>
  )
}

// Skeleton components for common layouts
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
        </div>
      </CardContent>
    </Card>
  )
}

export function TableSkeleton({ 
  rows = 5, 
  columns = 4, 
  className 
}: { 
  rows?: number
  columns?: number
  className?: string 
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function ListSkeleton({ 
  items = 3, 
  className 
}: { 
  items?: number
  className?: string 
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Loading wrapper component
export function LoadingWrapper({ 
  isLoading, 
  error, 
  isEmpty,
  loadingComponent,
  errorComponent,
  emptyComponent,
  children,
  className 
}: {
  isLoading: boolean
  error?: Error | string | null
  isEmpty?: boolean
  loadingComponent?: React.ReactNode
  errorComponent?: React.ReactNode
  emptyComponent?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  if (isLoading) {
    return (
      <div className={className}>
        {loadingComponent || <PageLoading />}
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        {errorComponent || <ErrorDisplay error={error} />}
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className={className}>
        {emptyComponent || <EmptyState title="No data available" />}
      </div>
    )
  }

  return <div className={className}>{children}</div>
}
