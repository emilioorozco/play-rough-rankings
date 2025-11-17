'use client'

import { useAppStore } from '@/stores/app-store'
import { useCallback } from 'react'

export interface ToastOptions {
  title: string
  description?: string
  variant?: 'default' | 'success' | 'warning' | 'error'
  duration?: number
}

export function useToast() {
  const addNotification = useAppStore(state => state.addNotification)

  const toast = useCallback((options: ToastOptions) => {
    // Map toast variants to notification types
    // Since notification types are limited, we'll use tournament_status as the default
    const notificationType: 'tournament_result' | 'leaderboard_update' | 'tournament_status' = 
      options.variant === 'error' || options.variant === 'warning' 
        ? 'tournament_status' 
        : options.variant === 'success' 
        ? 'leaderboard_update' 
        : 'tournament_status'
    
    addNotification({
      type: notificationType,
      title: options.title,
      message: options.description || options.title,
      data: {
        variant: options.variant,
        description: options.description,
      },
    })
  }, [addNotification])

  return { toast }
}
