'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EmailVerificationPending } from '@/components/auth/email-verification-pending'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showResend, setShowResend] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const verifyMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: (data) => {
      setVerificationStatus('success')
      // Auto-redirect to profile completion after 2 seconds
      setTimeout(() => {
        router.push('/profile-completion')
      }, 2000)
    },
    onError: (error) => {
      setVerificationStatus('error')
      
      // Display user-friendly error message from server
      setErrorMessage(error.message || 'Failed to verify email. Please try again.')
      
      // Show resend option for expired or invalid tokens
      if (error.message.includes('expired') || error.message.includes('invalid') || error.message.includes('Invalid')) {
        setShowResend(true)
      }
    },
  })

  useEffect(() => {
    if (!token) {
      setVerificationStatus('error')
      setErrorMessage('No verification token provided. Please check your email link.')
      return
    }

    // Attempt to verify the email
    verifyMutation.mutate({ token })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (verificationStatus === 'loading') {
    return (
      <div className="container flex items-center justify-center min-h-screen py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
            <CardTitle>Verifying Your Email</CardTitle>
            <CardDescription>
              Please wait while we verify your email address...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (verificationStatus === 'success') {
    return (
      <div className="container flex items-center justify-center min-h-screen py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <CardTitle>Email Verified!</CardTitle>
            <CardDescription>
              Your email has been successfully verified.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-success bg-success/10">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                You&apos;re being redirected to complete your profile...
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => router.push('/profile-completion')}
              className="w-full"
            >
              Continue to Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (showResend && userEmail) {
    return (
      <div className="container flex items-center justify-center min-h-screen py-8">
        <EmailVerificationPending 
          email={userEmail}
          onClose={() => router.push('/')}
        />
      </div>
    )
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Verification Failed</CardTitle>
          <CardDescription>
            We couldn&apos;t verify your email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>

          {showResend && (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Please enter your email address to receive a new verification link:
              </p>
              <input
                type="email"
                placeholder="your@email.com"
                className="w-full px-3 py-2 border rounded-md"
                onChange={(e) => setUserEmail(e.target.value)}
              />
              <Button
                onClick={() => {
                  if (userEmail) {
                    setShowResend(true)
                  }
                }}
                disabled={!userEmail}
                className="w-full"
              >
                Request New Verification Email
              </Button>
            </div>
          )}

          <Button
            onClick={() => router.push('/')}
            variant="outline"
            className="w-full"
          >
            Return to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="container flex items-center justify-center min-h-screen py-8">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
              <CardTitle>Loading...</CardTitle>
              <CardDescription>
                Please wait...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}
