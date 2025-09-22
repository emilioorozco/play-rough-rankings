'use client'

import React, { createContext, useContext, useEffect, ReactNode } from 'react'
import { useGlobalLoading, useGlobalError } from '@/stores/loading-store'
import { useSession } from './auth/session-provider'
import { ErrorDisplay } from './ui/loading-states'
import { LoadingBar } from './ui/loading-bar'
import { Modal } from './ui/modal'
import { Button } from './ui/button'
import { RefreshCw } from 'lucide-react'

interface LoadingProviderProps {
  children: ReactNode
}

interface LoadingContextType {
  showGlobalError: (error: Error | string) => void
  hideGlobalError: () => void
  setGlobalLoading: (loading: boolean) => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function LoadingProvider({ children }: LoadingProviderProps) {
  const { isLoading: authLoading } = useSession()
  const { isGlobalLoading, setGlobalLoading } = useGlobalLoading()
  const { globalError, setGlobalError, clearGlobalError } = useGlobalError()

  // Set global loading when auth is loading
  useEffect(() => {
    setGlobalLoading(authLoading)
  }, [authLoading, setGlobalLoading])

  const contextValue: LoadingContextType = {
    showGlobalError: setGlobalError,
    hideGlobalError: clearGlobalError,
    setGlobalLoading,
  }

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
      
      {/* Global Error Overlay */}
      <Modal
        isOpen={!!globalError}
        onClose={clearGlobalError}
        title="Application Error"
        size="md"
        closeOnOverlayClick={false}
      >
        <ErrorDisplay
          error={globalError}
          title=""
          description="An unexpected error occurred. Please try again or contact support if the problem persists."
          onRetry={clearGlobalError}
          showDetails={process.env.NODE_ENV === 'development'}
          className="mb-4"
        />
        <div className="flex gap-3 justify-center">
          <Button onClick={clearGlobalError} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </Modal>
      
      {/* Global Loading Bar */}
      <LoadingBar isLoading={isGlobalLoading} />
    </LoadingContext.Provider>
  )
}

export function useLoadingContext() {
  const context = useContext(LoadingContext)
  if (context === undefined) {
    throw new Error('useLoadingContext must be used within a LoadingProvider')
  }
  return context
}
