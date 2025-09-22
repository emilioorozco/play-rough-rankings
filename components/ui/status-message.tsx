import React from 'react'
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatusType = 'success' | 'warning' | 'error'

interface StatusMessageProps {
  message: string
  type?: StatusType
  className?: string
}

const statusConfig = {
  success: {
    icon: CheckCircle,
    iconClassName: 'text-primary',
    textClassName: 'text-foreground'
  },
  warning: {
    icon: AlertTriangle,
    iconClassName: 'text-yellow-500',
    textClassName: 'text-foreground'
  },
  error: {
    icon: XCircle,
    iconClassName: 'text-destructive',
    textClassName: 'text-foreground'
  }
}

export function StatusMessage({ message, type = 'success', className }: StatusMessageProps) {
  const config = statusConfig[type]
  const Icon = config.icon

  return (
    <div className={cn('flex items-start gap-2 text-sm', className)}>
      <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', config.iconClassName)} />
      <span className={config.textClassName}>{message}</span>
    </div>
  )
}

// Backward compatibility - keep SuccessMessage as an alias
export const SuccessMessage = StatusMessage
