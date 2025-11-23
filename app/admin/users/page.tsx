'use client'

import { useState } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SendRoleInvitationModal } from '@/components/admin/send-role-invitation-modal'
import { trpc } from '@/lib/trpc/client'
import { Loader2, Mail, Shield, UserCog, Users } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface SelectedUser {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  role: string
}

export default function AdminUsersPage() {
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null)
  const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false)

  // Fetch all users (we'll need to add this endpoint to tRPC)
  const { data: users, isLoading, refetch } = trpc.user.list.useQuery(undefined, {
    // For now, we'll handle the case where the endpoint doesn't exist
    retry: false,
  })

  // Fetch role invitations to show pending status
  const { data: invitations } = trpc.auth.listRoleInvitations.useQuery(undefined, {
    retry: false,
  })

  const handleInviteUser = (user: SelectedUser) => {
    setSelectedUser(user)
    setIsInvitationModalOpen(true)
  }

  const handleInvitationSuccess = () => {
    refetch()
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default'
      case 'organizer':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-3 w-3" />
      case 'organizer':
        return <UserCog className="h-3 w-3" />
      default:
        return <Users className="h-3 w-3" />
    }
  }

  const getPendingInvitation = (email: string) => {
    return invitations?.find(
      (inv) => inv.email === email && !inv.acceptedAt && new Date(inv.expiresAt) > new Date()
    )
  }

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="container">
        <div className="hero-section">
          <h1>User Management</h1>
          <p>Manage user accounts, roles, and permissions</p>
        </div>

        <div className="space-y-6">
          {/* User Statistics */}
          <div className="card p-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">User Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {users?.length || '-'}
                </div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {users?.filter((u) => u.role === 'player').length || '-'}
                </div>
                <div className="text-sm text-muted-foreground">Active Players</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {users?.filter((u) => u.role === 'organizer').length || '-'}
                </div>
                <div className="text-sm text-muted-foreground">Organizers</div>
              </div>
            </div>
          </div>

          {/* User List */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-foreground">All Users</h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Refresh'
                )}
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !users || users.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const pendingInvitation = getPendingInvitation(user.email)
                      const userName =
                        user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.firstName || user.lastName || 'No name'

                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{userName}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge
                              variant={getRoleBadgeVariant(user.role)}
                              className="flex items-center gap-1 w-fit"
                            >
                              {getRoleIcon(user.role)}
                              <span className="capitalize">{user.role}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {pendingInvitation ? (
                              <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                <Mail className="h-3 w-3" />
                                Pending {pendingInvitation.role}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">Active</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleInviteUser(user)}
                              disabled={user.role === 'admin'}
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              Invite to Role
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Role Invitation Modal */}
      {selectedUser && (
        <SendRoleInvitationModal
          user={selectedUser}
          isOpen={isInvitationModalOpen}
          onClose={() => {
            setIsInvitationModalOpen(false)
            setSelectedUser(null)
          }}
          onSuccess={handleInvitationSuccess}
        />
      )}
    </ProtectedRoute>
  )
}
