import { ProtectedRoute } from '@/components/auth/protected-route'
import { PlayerDashboard } from '@/components/player/player-dashboard'

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <div className="container">
        <PlayerDashboard />
      </div>
    </ProtectedRoute>
  )
}