'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { trpc } from '@/lib/trpc/client'
import { Loader2, Shield, UserCog, Calendar, User, CheckCircle, XCircle } from 'lucide-react'

interface RoleInvitationAcceptProps {
  invitation: {
    id: string
    email: string
    role: 'organizer' | 'admin'
    invitedBy: {
      name: string
      email: string
    }
    expiresAt: Date | string
    createdAt: Date | string
    isExpired: boolean
    isAccepted: boolean
  }
  token: string
}

const ROLE_INFO = {
  organizer: {
    label: 'Tournament Organizer',
    description: 'As a Tournament Organizer, you will be able to:',
    permissions: [
      'Create and manage tournaments',
      'Upload tournament results',
      'Manage tournament participants and entries',
      'Access tournament management tools',
      'View comprehensive tournament analytics'
    ],
    icon: UserCog,
    color: 'text-blue-600'
  },
  admin: {
    label: 'Administrator',
    description: 'As an Administrator, you will have full system access including:',
    permissions: [
      'All Tournament Organizer permissions',
      'System administration and configuration',
      'Complete game management (create/update/toggle games)',
      'User oversight and role management',
      'Store management and venue administration',
      'Access to admin dashboard and user management tools'
    ],
    icon: Shield,
    color: 'text-primary'
  }
}

export function RoleInvitationAccept({ invitation, token }: RoleInvitationAcceptProps) {
  const router = useRouter()
  const [isAccepting, setIsAccepting] = useState(false)
  const [isDeclining, setIsDeclining] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const acceptInvitationMutation = trpc.auth.acceptRoleInvitation.useMutation({
    onSuccess: (data) => {
      // Use server success message
      setSuccessMessage(data?.message || 'Invitation accepted successfully! Redirecting to dashboard...')
      setErrorMessage(null)
      setTimeout(() => {
        router.push('/dash' as any)
      }, 2000)
    },
    onError: (error) => {
      // Display user-friendly error message from server
      setErrorMessage(error.message || 'Failed to accept invitation. Please try again.')
      setSuccessMessage(null)
      setIsAccepting(false)
    }
  })

  const handleAccept = async () => {
    setIsAccepting(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    acceptInvitationMutation.mutate({
      token
    })
  }

  const handleDecline = () => {
    setIsDeclining(true)
    // For now, just redirect to home page
    // In the future, we could add a decline endpoint
    setTimeout(() => {
      router.push('/' as any)
    }, 500)
  }

  const roleInfo = ROLE_INFO[invitation.role]
  const RoleIcon = roleInfo.icon
  const inviterName = invitation.invitedBy.name

  const expiresAt = new Date(invitation.expiresAt)
  const isExpired = invitation.isExpired
  
  // Calculate time until expiration
  const getExpirationText = () => {
    if (isExpired) return 'Expired'
    
    const now = new Date()
    const diff = expiresAt.getTime() - now.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) {
      return `in ${days} day${days > 1 ? 's' : ''}`
    } else if (hours > 0) {
      return `in ${hours} hour${hours > 1 ? 's' : ''}`
    } else {
      return 'soon'
    }
  }
  
  const expiresIn = getExpirationText()

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <RoleIcon className={`h-8 w-8 ${roleInfo.color}`} />
          <div>
            <CardTitle>You&apos;ve Been Invited!</CardTitle>
            <CardDescription>
              You&apos;ve been invited to become a {roleInfo.label}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Invitation Details */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Invited by</p>
                <p className="text-sm font-medium text-foreground">{inviterName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Expires</p>
                <p className={`text-sm font-medium ${isExpired ? 'text-destructive' : 'text-foreground'}`}>
                  {isExpired ? 'Expired' : expiresIn}
                </p>
              </div>
            </div>
          </div>

          {/* Expiration Warning */}
          {isExpired && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <div className="ml-2">
                <p className="font-medium">This invitation has expired</p>
                <p className="text-sm">Please contact an administrator for a new invitation.</p>
              </div>
            </Alert>
          )}

          {!isExpired && expiresAt.getTime() - Date.now() < 24 * 60 * 60 * 1000 && (
            <Alert>
              <Calendar className="h-4 w-4" />
              <div className="ml-2">
                <p className="font-medium">This invitation expires soon</p>
                <p className="text-sm">Please accept or decline before it expires.</p>
              </div>
            </Alert>
          )}
        </div>

        {/* Role Description and Permissions */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">{roleInfo.description}</h3>
          <ul className="space-y-2">
            {roleInfo.permissions.map((permission, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span>{permission}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Status Messages */}
        {successMessage && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <div className="ml-2">
              <p className="font-medium text-success">{successMessage}</p>
            </div>
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <div className="ml-2">
              <p className="font-medium">Error</p>
              <p className="text-sm">{errorMessage}</p>
            </div>
          </Alert>
        )}

        {/* Action Buttons */}
        {!isExpired && !successMessage && (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleDecline}
              variant="secondary"
              disabled={isAccepting || isDeclining}
              className="flex-1"
            >
              {isDeclining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Declining...
                </>
              ) : (
                'Decline'
              )}
            </Button>
            <Button
              onClick={handleAccept}
              disabled={isAccepting || isDeclining}
              className="flex-1"
            >
              {isAccepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                'Accept Invitation'
              )}
            </Button>
          </div>
        )}

        {isExpired && (
          <Button
            onClick={() => router.push('/' as any)}
            variant="secondary"
            className="w-full"
          >
            Return to Home
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
