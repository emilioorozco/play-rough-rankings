import { ProtectedRoute } from '@/components/auth/protected-route'
import { RoleDashboard } from '@/components/auth/role-dashboard'

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="container">
        <RoleDashboard />
      </div>
    </ProtectedRoute>
  )
}