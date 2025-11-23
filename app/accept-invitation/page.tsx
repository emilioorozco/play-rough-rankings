'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { RoleInvitationAccept } from '@/components/auth/role-invitation-accept'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc/client'
import { Loader2, XCircle } from 'lucide-react'

function AcceptInvitationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { data: invitationResponse, isLoading, error } = trpc.auth.getRoleInvitation.useQuery(
    { token: token || '' },
    {
      enabled: !!token,
      retry: false
    }
  )

  const invitation = invitationResponse?.invitation

  useEffect(() => {
    if (!token) {
      setErrorMessage('Invalid invitation link. No token provided.')
    } else if (error) {
      setErrorMessage(error.message)
    }
  }, [token, error])

  // Loading state
  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto py-12">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading invitation details...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (errorMessage || !invitation) {
    return (
      <div className="container max-w-2xl mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              We couldn&apos;t find this invitation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <div className="ml-2">
                <p className="font-medium">Error</p>
                <p className="text-sm">
                  {errorMessage || 'This invitation link is invalid or has expired.'}
                </p>
              </div>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This could happen if:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
                <li>The invitation link has expired</li>
                <li>The invitation has already been accepted</li>
                <li>The invitation link is invalid or incomplete</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => router.push('/')}
                variant="secondary"
                className="flex-1"
              >
                Return to Home
              </Button>
              <Button
                onClick={() => router.push('/profile')}
                className="flex-1"
              >
                Go to Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state - show invitation details
  return (
    <div className="container max-w-2xl mx-auto py-12">
      <RoleInvitationAccept 
        invitation={{
          ...invitation,
          role: invitation.role as 'organizer' | 'admin'
        }} 
        token={token || ''} 
      />
    </div>
  )
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="container max-w-2xl mx-auto py-12">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  )
}
