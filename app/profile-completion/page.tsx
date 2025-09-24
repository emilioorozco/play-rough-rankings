import { ProtectedRoute } from '@/components/auth/protected-route'
import { ProfileCompletion as ProfileCompletionForm } from '@/components/auth/profile-completion'

export default function ProfileCompletionPage() {
  return (
    <ProtectedRoute>
      <div className="container max-w-md mx-auto py-8">
        <ProfileCompletionForm />
      </div>
    </ProtectedRoute>
  )
}
