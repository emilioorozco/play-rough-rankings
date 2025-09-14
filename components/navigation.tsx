'use client'

import Link from 'next/link'
import { useSession } from './auth/session-provider'
import { UserMenu } from './auth/user-menu'
import { ThemeToggle } from './theme-toggle'
import { ActivityIndicator } from './activity-indicator'

export function Navigation() {
  const { user, isLoading } = useSession()

  return (
    <header className="main-navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <Link href="/">
            <h1 className="brand-title">Play Rough Rankings</h1>
          </Link>
        </div>
        
        <nav className="nav-links">
          <Link href="/leaderboards">Leaderboards</Link>
          <Link href="/tournaments">Tournaments</Link>
          <Link href="/players">Players</Link>
          
          {user && (
            <>
              <Link href="/dashboard">Dashboard</Link>
              {(user.role === 'organizer' || user.role === 'admin') && (
                <Link href="/tournaments/manage">Manage</Link>
              )}
              {user.role === 'admin' && (
                <Link href="/admin">Admin</Link>
              )}
            </>
          )}
        </nav>

        <div className="nav-auth">
          {user && <ActivityIndicator showDetails={false} />}
          <ThemeToggle />
          
          {isLoading ? (
            <span>Loading...</span>
          ) : user ? (
            <UserMenu />
          ) : (
            <Link href="/login" className="login-link">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}