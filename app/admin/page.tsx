'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { ProtectedRoute } from '@/components/auth/protected-route'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'games' | 'users' | 'system' | 'email'>('games')
  const [metricsDays, setMetricsDays] = useState(30)

  // Get system stats
  const { data: gamesData } = trpc.games.list.useQuery({ includeInactive: true })
  
  // Get email metrics
  const { data: emailMetrics, isLoading: metricsLoading } = trpc.emailMetrics.getMetrics.useQuery({
    channel: 'email',
    days: metricsDays,
  })
  
  const { data: compliance } = trpc.emailMetrics.checkCompliance.useQuery({
    channel: 'email',
    days: metricsDays,
  })
  
  const { data: deliveryStats } = trpc.emailMetrics.getDeliveryStats.useQuery({})
  
  const { data: suppressionStats } = trpc.emailMetrics.getSuppressionStats.useQuery({ channel: 'email' })

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
            <button
              className={`tab-button ${activeTab === 'email' ? 'active' : ''}`}
              onClick={() => setActiveTab('email')}
            >
              <span className="tab-icon">📧</span>
              <span className="tab-label">Email</span>
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

          {activeTab === 'email' && (
            <div className="email-admin">
              <div className="admin-section">
                <h2>Email Metrics & Monitoring</h2>
                <p className="text-muted-foreground mb-4">
                  Monitor email delivery rates, bounce/complaint rates, and AWS SES compliance status
                </p>

                {/* Time Period Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Time Period:</label>
                  <select
                    value={metricsDays}
                    onChange={(e) => setMetricsDays(Number(e.target.value))}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                </div>

                {/* AWS SES Compliance Status */}
                {compliance && (
                  <div className={`mb-6 p-4 rounded-lg border-2 ${
                    compliance.compliant 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <h3 className="text-lg font-semibold mb-2">
                      AWS SES Compliance Status
                      {compliance.compliant ? (
                        <span className="ml-2 text-green-600">✅ Compliant</span>
                      ) : (
                        <span className="ml-2 text-red-600">⚠️ Non-Compliant</span>
                      )}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <strong>Bounce Rate:</strong> {compliance.metrics.bounceRate.toFixed(2)}%
                        {compliance.bounceCompliant ? (
                          <span className="text-green-600 ml-2">✓</span>
                        ) : (
                          <span className="text-red-600 ml-2">✗ (Limit: {compliance.limits.bounceLimit}%)</span>
                        )}
                      </div>
                      <div>
                        <strong>Complaint Rate:</strong> {compliance.metrics.complaintRate.toFixed(4)}%
                        {compliance.complaintCompliant ? (
                          <span className="text-green-600 ml-2">✓</span>
                        ) : (
                          <span className="text-red-600 ml-2">✗ (Limit: {compliance.limits.complaintLimit}%)</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Email Metrics Overview */}
                {emailMetrics && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="stat-card">
                      <h4>Total Sent</h4>
                      <div className="stat-number">{emailMetrics.totalSent.toLocaleString()}</div>
                      <small>Last {metricsDays} days</small>
                    </div>
                    <div className={`stat-card ${
                      emailMetrics.bounceWarning ? 'border-red-300 bg-red-50' : ''
                    }`}>
                      <h4>Bounce Rate</h4>
                      <div className={`stat-number ${
                        emailMetrics.bounceWarning ? 'text-red-600' : ''
                      }`}>
                        {emailMetrics.bounceRate.toFixed(2)}%
                      </div>
                      <small>
                        {emailMetrics.totalBounces} bounces
                        {emailMetrics.bounceWarning && ' ⚠️ Warning'}
                      </small>
                    </div>
                    <div className={`stat-card ${
                      emailMetrics.complaintWarning ? 'border-red-300 bg-red-50' : ''
                    }`}>
                      <h4>Complaint Rate</h4>
                      <div className={`stat-number ${
                        emailMetrics.complaintWarning ? 'text-red-600' : ''
                      }`}>
                        {emailMetrics.complaintRate.toFixed(4)}%
                      </div>
                      <small>
                        {emailMetrics.totalComplaints} complaints
                        {emailMetrics.complaintWarning && ' ⚠️ Warning'}
                      </small>
                    </div>
                  </div>
                )}

                {/* Delivery Statistics */}
                {deliveryStats && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Delivery Statistics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="stat-card">
                        <h4>Total Attempts</h4>
                        <div className="stat-number">{deliveryStats.total.toLocaleString()}</div>
                      </div>
                      <div className="stat-card">
                        <h4>Sent</h4>
                        <div className="stat-number text-green-600">{deliveryStats.sent.toLocaleString()}</div>
                      </div>
                      <div className="stat-card">
                        <h4>Failed</h4>
                        <div className="stat-number text-red-600">{deliveryStats.failed.toLocaleString()}</div>
                      </div>
                      <div className="stat-card">
                        <h4>Suppressed</h4>
                        <div className="stat-number text-yellow-600">{deliveryStats.suppressed.toLocaleString()}</div>
                      </div>
                      <div className="stat-card">
                        <h4>Bounced</h4>
                        <div className="stat-number text-orange-600">{deliveryStats.bounced.toLocaleString()}</div>
                      </div>
                      <div className="stat-card">
                        <h4>Complained</h4>
                        <div className="stat-number text-red-600">{deliveryStats.complained.toLocaleString()}</div>
                      </div>
                      <div className="stat-card col-span-2 md:col-span-3">
                        <h4>Success Rate</h4>
                        <div className="stat-number text-green-600">{deliveryStats.successRate.toFixed(2)}%</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Suppression Statistics */}
                {suppressionStats && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Suppression List</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="stat-card">
                        <h4>Total Suppressed</h4>
                        <div className="stat-number">{suppressionStats.total.toLocaleString()}</div>
                      </div>
                      <div className="stat-card">
                        <h4>Hard Bounces</h4>
                        <div className="stat-number">{suppressionStats.hardBounces.toLocaleString()}</div>
                      </div>
                      <div className="stat-card">
                        <h4>Soft Bounces</h4>
                        <div className="stat-number">{suppressionStats.softBounces.toLocaleString()}</div>
                      </div>
                      <div className="stat-card">
                        <h4>Complaints</h4>
                        <div className="stat-number">{suppressionStats.complaints.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                )}

                {metricsLoading && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading metrics...</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}