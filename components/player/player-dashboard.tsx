'use client'

import { useSession } from '@/components/auth/session-provider'
import { trpc } from '@/lib/trpc/client'
import { PlayerStatsDisplay } from './player-stats-display'
import { ExternalPlayerIdManager } from './external-player-id-manager'
import { PrivacyControls } from './privacy-controls'
import { UserPreferences } from '@/components/auth/user-preferences'
import { useTab } from '@/hooks/stores/use-ui-store'

export function PlayerDashboard() {
  const { user } = useSession()
  const { activeTab, setTab } = useTab('playerDashboard')

  // Get available games for filtering
  const { data: games } = trpc.games.list.useQuery({ includeInactive: false })
  
  // Get player profile data (this will be implemented when auth is fully set up)
  // For now, we'll show placeholder data
  const playerProfile = {
    id: user?.id || '',
    displayName: user?.name || 'Anonymous Player',
    profileVisibility: 'PUBLIC' as const,
    externalPlayerIds: {},
    gameStats: [],
  }

  if (!user) {
    return (
      <div className="text-center">
        <h2>Player Dashboard</h2>
        <p>Please sign in to view your player dashboard.</p>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'stats', label: 'Game Stats', icon: '🎯' },
    { id: 'external-ids', label: 'Player IDs', icon: '🆔' },
    { id: 'privacy', label: 'Privacy', icon: '🔒' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
  ] as const

  return (
    <div className="player-dashboard">
      <header className="dashboard-header mb-4">
        <h1>Player Dashboard</h1>
        <p>Welcome back, {playerProfile.displayName}! Track your performance and manage your profile.</p>
      </header>

      {/* Tab Navigation */}
      <nav className="dashboard-tabs mb-4">
        <div className="tab-list" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="profile-summary mb-4">
              <div className="grid">
                <div className="profile-info">
                  <h3>Profile Information</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Display Name</label>
                      <p>{playerProfile.displayName}</p>
                    </div>
                    <div className="info-item">
                      <label>Profile Visibility</label>
                      <p>
                        <span className={`visibility-badge ${playerProfile.profileVisibility.toLowerCase()}`}>
                          {playerProfile.profileVisibility === 'PUBLIC' ? '🌐 Public' : '🔒 Private'}
                        </span>
                      </p>
                    </div>
                    <div className="info-item">
                      <label>Member Since</label>
                      <p>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</p>
                    </div>
                    <div className="info-item">
                      <label>Account Role</label>
                      <p>
                        <span className="role-badge">{user.role}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="quick-stats">
                  <h3>Quick Stats</h3>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <h4>Games Played</h4>
                      <p className="stat-number">{games?.length || 0}</p>
                      <small>Different games</small>
                    </div>
                    <div className="stat-card">
                      <h4>Tournaments</h4>
                      <p className="stat-number">--</p>
                      <small>All time</small>
                    </div>
                    <div className="stat-card">
                      <h4>Win Rate</h4>
                      <p className="stat-number">--%</p>
                      <small>Overall</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="recent-activity">
              <h3>Recent Activity</h3>
              <div className="activity-placeholder">
                <p className="text-muted">
                  Your recent tournament activity will appear here once you participate in tournaments.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <PlayerStatsDisplay 
            playerId={playerProfile.id}
            games={games || []}
          />
        )}

        {activeTab === 'external-ids' && (
          <ExternalPlayerIdManager 
            playerId={playerProfile.id}
            externalPlayerIds={playerProfile.externalPlayerIds}
            games={games || []}
          />
        )}

        {activeTab === 'privacy' && (
          <PrivacyControls 
            playerId={playerProfile.id}
            currentVisibility={playerProfile.profileVisibility}
          />
        )}

        {activeTab === 'preferences' && (
          <UserPreferences />
        )}
      </div>
    </div>
  )
}