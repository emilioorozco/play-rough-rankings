'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { ProtectedRoute } from '@/components/auth/protected-route'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'games' | 'users' | 'system'>('games')

  // Get system stats
  const { data: gamesData } = trpc.games.list.useQuery({ includeInactive: true })

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="container">
        <div className="hero-section">
          <h1>Admin Dashboard</h1>
          <p>System administration and management tools</p>
        </div>

        {/* Tab Navigation */}
        <div className="admin-tabs">
          <div className="tab-list">
            <button
              className={`tab-button ${activeTab === 'games' ? 'active' : ''}`}
              onClick={() => setActiveTab('games')}
            >
              <span className="tab-icon">🎮</span>
              <span className="tab-label">Games</span>
            </button>
            <button
              className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <span className="tab-icon">👥</span>
              <span className="tab-label">Users</span>
            </button>
            <button
              className={`tab-button ${activeTab === 'system' ? 'active' : ''}`}
              onClick={() => setActiveTab('system')}
            >
              <span className="tab-icon">⚙️</span>
              <span className="tab-label">System</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'games' && (
            <div className="games-admin">
              <div className="admin-section">
                <h2>Game Management</h2>
                <div className="games-grid">
                  {gamesData?.map((game) => (
                    <div key={game.id} className="game-admin-card">
                      <div className="game-header">
                        <h3>{game.name}</h3>
                        <span className={`status-badge ${game.isActive ? 'active' : 'inactive'}`}>
                          {game.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="game-stats">
                        <div className="stat-item">
                          <span className="label">Tournaments:</span>
                          <span className="value">{game.tournamentCount}</span>
                        </div>
                        <div className="stat-item">
                          <span className="label">Players:</span>
                          <span className="value">{game.playerCount}</span>
                        </div>
                      </div>
                      <div className="game-actions">
                        <button className="btn-secondary">Edit</button>
                        <button className={`btn-${game.isActive ? 'danger' : 'primary'}`}>
                          {game.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="add-game-section">
                  <h3>Add New Game</h3>
                  <p>Currently supporting Pokemon TCG. Additional games can be added here.</p>
                  <button className="btn-primary" disabled>
                    Add Game (Coming Soon)
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="users-admin">
              <div className="admin-section">
                <h2>User Management</h2>
                <div className="user-stats">
                  <div className="stat-card">
                    <h4>Total Users</h4>
                    <div className="stat-number">-</div>
                    <small>Coming Soon</small>
                  </div>
                  <div className="stat-card">
                    <h4>Active Players</h4>
                    <div className="stat-number">-</div>
                    <small>Coming Soon</small>
                  </div>
                  <div className="stat-card">
                    <h4>Organizers</h4>
                    <div className="stat-number">-</div>
                    <small>Coming Soon</small>
                  </div>
                </div>
                
                <div className="user-management">
                  <h3>User Management Tools</h3>
                  <p>User role management and moderation tools will be available here.</p>
                  <div className="management-actions">
                    <button className="btn-secondary" disabled>
                      View All Users (Coming Soon)
                    </button>
                    <button className="btn-secondary" disabled>
                      Manage Roles (Coming Soon)
                    </button>
                    <button className="btn-secondary" disabled>
                      User Reports (Coming Soon)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="system-admin">
              <div className="admin-section">
                <h2>System Information</h2>
                <div className="system-stats">
                  <div className="stat-card">
                    <h4>Database Status</h4>
                    <div className="stat-number">✅</div>
                    <small>Connected</small>
                  </div>
                  <div className="stat-card">
                    <h4>API Status</h4>
                    <div className="stat-number">✅</div>
                    <small>Operational</small>
                  </div>
                  <div className="stat-card">
                    <h4>Cache Status</h4>
                    <div className="stat-number">✅</div>
                    <small>Active</small>
                  </div>
                </div>
                
                <div className="system-actions">
                  <h3>System Management</h3>
                  <div className="action-grid">
                    <div className="action-card">
                      <h4>🔄 Refresh Rankings Cache</h4>
                      <p>Refresh all leaderboard rankings and statistics</p>
                      <button className="btn-secondary" disabled>
                        Refresh Cache (Coming Soon)
                      </button>
                    </div>
                    <div className="action-card">
                      <h4>📊 System Logs</h4>
                      <p>View system logs and error reports</p>
                      <button className="btn-secondary" disabled>
                        View Logs (Coming Soon)
                      </button>
                    </div>
                    <div className="action-card">
                      <h4>🗄️ Database Maintenance</h4>
                      <p>Database optimization and maintenance tools</p>
                      <button className="btn-secondary" disabled>
                        Maintenance (Coming Soon)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}