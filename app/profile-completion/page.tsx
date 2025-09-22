import { ProtectedRoute } from '@/components/auth/protected-route'
import { ProfileCompletionPage } from '@/components/auth/profile-completion-page'

export default function ProfileCompletionPage() {
  return (
    <ProtectedRoute>
      <div className="container max-w-md mx-auto py-8">
        <ProfileCompletionPage />
      </div>
    </ProtectedRoute>
  )
}
