'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'

export default function AdminUsersPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <div className="container">
        <div className="hero-section">
          <h1>User Management</h1>
          <p>Manage user accounts, roles, and permissions</p>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">User Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">-</div>
                <div className="text-sm text-muted-foreground">Total Users</div>
                <div className="text-xs text-muted-foreground mt-1">Coming Soon</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">-</div>
                <div className="text-sm text-muted-foreground">Active Players</div>
                <div className="text-xs text-muted-foreground mt-1">Coming Soon</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">-</div>
                <div className="text-sm text-muted-foreground">Organizers</div>
                <div className="text-xs text-muted-foreground mt-1">Coming Soon</div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">User Management Tools</h2>
            <p className="text-muted-foreground mb-6">
              User role management and moderation tools will be available here.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" disabled>
                View All Users (Coming Soon)
              </Button>
              <Button variant="secondary" disabled>
                Manage Roles (Coming Soon)
              </Button>
              <Button variant="secondary" disabled>
                User Reports (Coming Soon)
              </Button>
              <Button variant="secondary" disabled>
                Bulk Actions (Coming Soon)
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
