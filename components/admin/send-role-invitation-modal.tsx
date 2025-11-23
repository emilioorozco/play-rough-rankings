'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { FormField, FormSelect, FormStatus } from '@/components/ui/form-components'
import { trpc } from '@/lib/trpc/client'
import { Loader2, Shield, UserCog } from 'lucide-react'

interface SendRoleInvitationModalProps {
  user: {
    id: string
    email: string
    firstName?: string | null
    lastName?: string | null
    role: string
  }
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const ROLE_OPTIONS = [
  {
    value: 'organizer',
    label: 'Tournament Organizer',
    description: 'Can create and manage tournaments, upload results, and manage participants'
  },
  {
    value: 'admin',
    label: 'Administrator',
    description: 'Full system access including user management, game management, and all organizer permissions'
  }
]

export function SendRoleInvitationModal({
  user,
  isOpen,
  onClose,
  onSuccess
}: SendRoleInvitationModalProps) {
  const [selectedRole, setSelectedRole] = useState<'organizer' | 'admin'>('organizer')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const sendInvitationMutation = trpc.auth.sendRoleInvitation.useMutation({
    onSuccess: (data) => {
      // Use server success message
      setSuccessMessage(data?.message || `Invitation sent successfully to ${user.email}`)
      setErrorMessage(null)
      setTimeout(() => {
        onSuccess()
        handleClose()
      }, 2000)
    },
    onError: (error) => {
      // Display user-friendly error message from server
      setErrorMessage(error.message || 'Failed to send invitation. Please try again.')
      setSuccessMessage(null)
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage(null)
    setErrorMessage(null)

    sendInvitationMutation.mutate({
      email: user.email,
      role: selectedRole
    })
  }

  const handleClose = () => {
    setSelectedRole('organizer')
    setSuccessMessage(null)
    setErrorMessage(null)
    onClose()
  }

  const userName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.firstName || user.lastName || user.email

  const selectedRoleInfo = ROLE_OPTIONS.find(opt => opt.value === selectedRole)

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Send Role Invitation">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User Information */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">User Information</h3>
          <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Name:</span>
              <span className="text-sm font-medium text-foreground">{userName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Email:</span>
              <span className="text-sm font-medium text-foreground">{user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Role:</span>
              <span className="text-sm font-medium text-foreground capitalize">{user.role}</span>
            </div>
          </div>
        </div>

        {/* Role Selection */}
        <FormField label="Select Role to Invite" required>
          <FormSelect
            value={selectedRole}
            onValueChange={(value) => setSelectedRole(value as 'organizer' | 'admin')}
            options={ROLE_OPTIONS.map(opt => ({
              value: opt.value,
              label: opt.label
            }))}
            placeholder="Select a role"
            disabled={sendInvitationMutation.isPending}
          />
        </FormField>

        {/* Role Description */}
        {selectedRoleInfo && (
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex items-start gap-3">
              {selectedRole === 'admin' ? (
                <Shield className="h-5 w-5 text-primary mt-0.5" />
              ) : (
                <UserCog className="h-5 w-5 text-primary mt-0.5" />
              )}
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-foreground">{selectedRoleInfo.label}</h4>
                <p className="text-sm text-muted-foreground">{selectedRoleInfo.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        <FormStatus success={successMessage || undefined} error={errorMessage || undefined} />

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={sendInvitationMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={sendInvitationMutation.isPending}
          >
            {sendInvitationMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Invitation...
              </>
            ) : (
              'Send Invitation'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
