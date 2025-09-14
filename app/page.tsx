'use client'

import { trpc } from '@/lib/trpc/client'
import { useSession } from '@/components/auth/session-provider'

export default function Home() {
  const { user } = useSession()
  const healthQuery = trpc.health.useQuery()
  const gamesQuery = trpc.games.list.useQuery({ includeInactive: false })
  const storesQuery = trpc.stores.list.useQuery({ includeInactive: false })

  return (
    <div className="container">
      <header className="hero-section">
        <h1 className="brand-title">Welcome to Play Rough Rankings</h1>
        <p>Tournament leaderboard service for local card game tournaments</p>
        {user && (
          <p>Welcome back, <strong>{user.name || user.email}</strong>!</p>
        )}
      </header>

      <section>
        <h2>System Status</h2>
        {healthQuery.data ? (
          <p>✅ System is healthy (Last check: {healthQuery.data.timestamp})</p>
        ) : (
          <p>⏳ Checking system status...</p>
        )}
      </section>

      <section>
        <h2>Available Games</h2>
        {gamesQuery.isLoading ? (
          <p>Loading games...</p>
        ) : gamesQuery.data && gamesQuery.data.length > 0 ? (
          <ul>
            {gamesQuery.data.map((game: {
              id: string
              name: string
              shortName: string
              tournamentCount: number
              playerCount: number
            }) => (
              <li key={game.id}>
                <strong>{game.name}</strong> ({game.shortName})
                {(game.tournamentCount > 0 || game.playerCount > 0) && (
                  <small>
                    {' '}({game.tournamentCount} tournaments, {game.playerCount} players)
                  </small>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No games configured yet.</p>
        )}
      </section>

      <section>
        <h2>Tournament Venues</h2>
        {storesQuery.isLoading ? (
          <p>Loading stores...</p>
        ) : storesQuery.data && storesQuery.data.stores.length > 0 ? (
          <ul>
            {storesQuery.data.stores.map((store: {
              id: string
              name: string
              city: string
              state: string
              tournamentCount: number
            }) => (
              <li key={store.id}>
                <strong>{store.name}</strong> - {store.city}, {store.state}
                {store.tournamentCount > 0 && (
                  <small> ({store.tournamentCount} tournaments)</small>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No stores configured yet.</p>
        )}
      </section>
    </div>
  )
}