'use client'

import { useSession } from './session-provider'
import { LoginModal } from './login-modal'
import { useModal } from '@/hooks/stores/use-ui-store'
import Link from 'next/link'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'player' | 'organizer' | 'admin'
  fallback?: React.ReactNode
  showLoginForm?: boolean
}

export function ProtectedRoute({ 
  children, 
  requiredRole = 'player',
  fallback,
  showLoginForm = true
}: ProtectedRouteProps) {
  const { user, isLoading } = useSession()
  const { isOpen: isLoginModalOpen, openModal, closeModal } = useModal('login')

  if (isLoading) {
    return (
      <div className="container">
        <div className="loading-container">
          <article aria-busy="true">
            <header>
              <h2>Loading...</h2>
            </header>
            <p>Checking your authentication status...</p>
          </article>
        </div>
      </div>
    )
  }

  if (!user) {
    if (fallback) {
      return <>{fallback}</>
    }
    
    if (showLoginForm) {
      return (
        <>
          <div className="container">
            <div className="access-denied">
              <header>
                <h2>Authentication Required</h2>
              </header>
              <p>You need to be signed in to access this page.</p>
              <button
                onClick={() => openModal({})}
                className="btn btn-primary"
                role="button"
              >
                Sign In
              </button>
            </div>
          </div>
          <LoginModal
            isOpen={isLoginModalOpen}
            onClose={closeModal}
            onSuccess={closeModal}
          />
        </>
      )
    }

    return (
      <>
        <div className="container">
          <div className="access-denied">
            <header>
              <h2>Authentication Required</h2>
            </header>
            <p>You need to be signed in to access this page.</p>
            <button
              onClick={() => openModal({})}
              className="btn btn-primary"
              role="button"
            >
              Sign In
            </button>
          </div>
        </div>
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={closeModal}
          onSuccess={closeModal}
        />
      </>
    )
  }

  // Check role permissions
  const roleHierarchy = {
    player: 0,
    organizer: 1,
    admin: 2,
  }

  const userRoleLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] ?? 0
  const requiredRoleLevel = roleHierarchy[requiredRole]

  if (userRoleLevel < requiredRoleLevel) {
    return (
      <div className="container">
        <div className="access-denied">
          <header>
            <h2>🚫 Access Denied</h2>
          </header>
          <p>You don&apos;t have permission to access this page.</p>
          <div style={{ marginTop: '1rem' }}>
            <p><strong>Required role:</strong> {requiredRole}</p>
            <p><strong>Your role:</strong> {user.role}</p>
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <Link href="/" role="button" className="outline">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}