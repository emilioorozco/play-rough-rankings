'use client'

import React, { useState } from 'react'
import { AlertCircle, CheckCircle, Loader2, Mail } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface EmailVerificationPendingProps {
  email: string
  onClose?: () => void
}

export function EmailVerificationPending({ email, onClose }: EmailVerificationPendingProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const resendMutation = trpc.auth.resendVerificationEmail.useMutation({
    onSuccess: (data) => {
      setSuccessMessage(data?.message || 'Verification email sent! Please check your inbox.')
      setErrorMessage(null)
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000)
    },
    onError: (error) => {
      setSuccessMessage(null)
      
      // Display user-friendly error message from server
      setErrorMessage(error.message || 'Failed to send verification email. Please try again.')
    },
  })

  const handleResend = () => {
    setSuccessMessage(null)
    setErrorMessage(null)
    resendMutation.mutate({ email })
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Verify Your Email</CardTitle>
        <CardDescription>
          We&apos;ve sent a verification email to
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="font-medium text-foreground">{email}</p>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Please check your inbox and click the verification link to complete your registration.
          </p>
          <p>
            If you don&apos;t see the email, check your spam folder.
          </p>
        </div>

        {successMessage && (
          <Alert className="border-success bg-success/10">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertDescription className="text-success">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Button
            onClick={handleResend}
            disabled={resendMutation.isPending}
            variant="outline"
            className="w-full"
          >
            {resendMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Resend Verification Email'
            )}
          </Button>

          {onClose && (
            <Button onClick={onClose} variant="ghost" className="w-full">
              Close
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
