'use client'

import { useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'

export default function PlayerProfilePage() {
  const params = useParams<{ id: string }>()
  const playerId = params?.id

  const { data, isLoading, error } = trpc.players.getProfile.useQuery(
    { playerId },
    { enabled: !!playerId }
  )

  if (!playerId) {
    return <div className="container mx-auto px-4 py-8">Invalid player id.</div>
  }

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading player...</div>
  }

  if (error) {
    return <div className="container mx-auto px-4 py-8">Failed to load player.</div>
  }

  if (!data) {
    return <div className="container mx-auto px-4 py-8">Player not found.</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">{data.user?.firstName || data.user?.name || 'Player'}</h1>
      <p className="text-muted-foreground mb-6">Player profile</p>
      {/* Minimal placeholder; can enhance with existing player components later */}
      <pre className="text-sm bg-muted/50 p-4 rounded">{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}


