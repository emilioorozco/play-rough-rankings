'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { TournamentUploadInterface } from '@/components/tournaments/tournament-upload-interface'
// Tournament Management List Component
function TournamentManagementList() {
  const { data: tournaments, isLoading } = trpc.tournaments.list.useQuery({
    limit: 20,
    offset: 0,
  })

  if (isLoading) {
    return <div className="loading">Loading tournaments...</div>
  }

  return (
    <div className="tournament-management-list">
      <div className="management-header">
        <h2>Your Tournaments</h2>
        <p>Manage your tournament settings and view details</p>
      </div>

      {tournaments && tournaments.tournaments.length > 0 ? (
        <div className="tournaments-grid">
          {tournaments.tournaments.map((tournament) => (
            <div key={tournament.id} className="tournament-manage-card">
              <div className="tournament-header">
                <h3>{tournament.name}</h3>
                <span className={`status-badge ${tournament.status.toLowerCase()}`}>
                  {tournament.status}
                </span>
              </div>
              
              <div className="tournament-details">
                <div className="detail-item">
                  <span className="label">Date:</span>
                  <span className="value">
                    {new Date(tournament.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">Game:</span>
                  <span className="value">{tournament.game.name}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Store:</span>
                  <span className="value">{tournament.store.name}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Matches:</span>
                  <span className="value">{tournament.matchCount}</span>
                </div>
              </div>
              
              <div className="tournament-actions">
                <button className="btn-secondary">
                  View Details
                </button>
                {tournament.status === 'UPCOMING' && (
                  <button className="btn-primary">
                    Start Tournament
                  </button>
                )}
                {tournament.status === 'ACTIVE' && (
                  <button className="btn-primary">
                    Upload Results
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-tournaments">
          <h3>No Tournaments Found</h3>
          <p>You haven&apos;t created any tournaments yet.</p>
          <button className="btn-primary">
            Create Tournament
          </button>
        </div>
      )}
    </div>
  )
}
import { ProtectedRoute } from '@/components/auth/protected-route'

export default function TournamentManagePage() {
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload')

  return (
    <ProtectedRoute requiredRole="organizer">
      <div className="container">
        <div className="hero-section">
          <h1>Tournament Management</h1>
          <p>Upload tournament results and manage your tournaments</p>
        </div>

        {/* Tab Navigation */}
        <div className="management-tabs">
          <div className="tab-list">
            <button
              className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <span className="tab-icon">📤</span>
              <span className="tab-label">Upload Results</span>
            </button>
            <button
              className={`tab-button ${activeTab === 'manage' ? 'active' : ''}`}
              onClick={() => setActiveTab('manage')}
            >
              <span className="tab-icon">⚙️</span>
              <span className="tab-label">Manage Tournaments</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'upload' && (
            <div className="upload-tab">
              <TournamentUploadInterface />
            </div>
          )}

          {activeTab === 'manage' && (
            <div className="manage-tab">
              <TournamentManagementList />
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}