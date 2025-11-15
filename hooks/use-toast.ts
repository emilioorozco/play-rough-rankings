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
    addNotification({
      id: `toast-${Date.now()}-${Math.random()}`,
      type: options.variant === 'error' ? 'error' : 
            options.variant === 'warning' ? 'warning' : 
            options.variant === 'success' ? 'success' : 'info',
      message: options.title,
      details: options.description,
      timestamp: new Date(),
      read: false,
    })
  }, [addNotification])

  return { toast }
}
