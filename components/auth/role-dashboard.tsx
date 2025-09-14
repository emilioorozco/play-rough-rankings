'use client'

import { useSession } from './session-provider'
import Link from 'next/link'

export function RoleDashboard() {
  const { user } = useSession()

  if (!user) {
    return null
  }

  const getWelcomeMessage = () => {
    switch (user.role) {
      case 'admin':
        return 'Welcome back, Administrator! You have full system access.'
      case 'organizer':
        return 'Welcome back, Tournament Organizer! Ready to manage some tournaments?'
      default:
        return 'Welcome back, Player! Check out your latest stats and upcoming tournaments.'
    }
  }

  const getQuickActions = () => {
    const actions = [
      { href: '/profile', label: 'View Profile', icon: '👤', description: 'Manage your account settings' },
      { href: '/leaderboards', label: 'Leaderboards', icon: '🏆', description: 'See current rankings' },
      { href: '/tournaments', label: 'Tournaments', icon: '🎯', description: 'Browse tournaments' },
    ]

    if (user.role === 'organizer' || user.role === 'admin') {
      actions.push(
        { href: '/tournaments/manage', label: 'Manage Tournaments', icon: '⚙️', description: 'Organize tournaments' },
        { href: '/tournaments/create', label: 'Create Tournament', icon: '➕', description: 'Start a new tournament' }
      )
    }

    if (user.role === 'admin') {
      actions.push(
        { href: '/admin', label: 'Admin Panel', icon: '🛠️', description: 'System administration' },
        { href: '/admin/users', label: 'Manage Users', icon: '👥', description: 'User management' },
        { href: '/admin/stores', label: 'Manage Stores', icon: '🏪', description: 'Store management' }
      )
    }

    return actions
  }

  const getRoleSpecificStats = () => {
    switch (user.role) {
      case 'admin':
        return (
          <div className="admin-stats">
            <h3>System Overview</h3>
            <div className="grid">
              <div className="stat-card">
                <h4>Total Users</h4>
                <p className="stat-number">--</p>
                <small>Active players</small>
              </div>
              <div className="stat-card">
                <h4>Active Tournaments</h4>
                <p className="stat-number">--</p>
                <small>This month</small>
              </div>
              <div className="stat-card">
                <h4>Stores</h4>
                <p className="stat-number">--</p>
                <small>Registered venues</small>
              </div>
            </div>
          </div>
        )
      
      case 'organizer':
        return (
          <div className="organizer-stats">
            <h3>Your Tournament Activity</h3>
            <div className="grid">
              <div className="stat-card">
                <h4>Tournaments Organized</h4>
                <p className="stat-number">--</p>
                <small>All time</small>
              </div>
              <div className="stat-card">
                <h4>Active Tournaments</h4>
                <p className="stat-number">--</p>
                <small>Currently running</small>
              </div>
              <div className="stat-card">
                <h4>Total Players</h4>
                <p className="stat-number">--</p>
                <small>Across your events</small>
              </div>
            </div>
          </div>
        )
      
      default:
        return (
          <div className="player-stats">
            <h3>Your Performance</h3>
            <div className="grid">
              <div className="stat-card">
                <h4>Tournaments Played</h4>
                <p className="stat-number">--</p>
                <small>All time</small>
              </div>
              <div className="stat-card">
                <h4>Win Rate</h4>
                <p className="stat-number">--%</p>
                <small>Overall performance</small>
              </div>
              <div className="stat-card">
                <h4>Current Ranking</h4>
                <p className="stat-number">--</p>
                <small>This season</small>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="role-dashboard">
      <header className="dashboard-header mb-4">
        <h1>Dashboard</h1>
        <p>{getWelcomeMessage()}</p>
      </header>

      {getRoleSpecificStats()}

      <section className="quick-actions mt-4">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          {getQuickActions().map((action) => (
            <Link key={action.href} href={action.href as `/dashboard` | `/tournaments` | `/leaderboards`} className="action-card">
              <div className="action-icon">{action.icon}</div>
              <div className="action-content">
                <h4>{action.label}</h4>
                <p>{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {user.role !== 'player' && (
        <section className="role-tools mt-4">
          <h3>
            {user.role === 'admin' ? 'Administrative Tools' : 'Organizer Tools'}
          </h3>
          <div className="tools-info" style={{
            padding: '1rem',
            backgroundColor: 'var(--pico-contrast-focus)',
            borderRadius: 'var(--pico-border-radius)',
            border: '1px solid var(--pico-contrast-border)'
          }}>
            {user.role === 'admin' ? (
              <p>
                As an administrator, you have access to all system features including user management, 
                store administration, and system configuration.
              </p>
            ) : (
              <p>
                As a tournament organizer, you can create and manage tournaments, upload results, 
                and track player participation in your events.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  )
}