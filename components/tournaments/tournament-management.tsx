'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { TournamentUploadInterface } from './tournament-upload-interface'

interface Tournament {
  id: string
  name: string
  status: string // API returns string, will be one of 'UPCOMING' | 'ACTIVE' | 'COMPLETED'
  date: string | Date
  matchCount: number
  participants?: Array<{
    id: string
    displayName: string
  }>
}

interface TournamentManagementProps {
  tournament: Tournament
}

export function TournamentManagement({ tournament }: TournamentManagementProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'upload' | 'settings'>('overview')
  
  const utils = trpc.useUtils()
  const updateStatusMutation = trpc.tournaments.updateStatus.useMutation({
    onSuccess: () => {
      utils.tournaments.getById.invalidate({ id: tournament.id })
    },
  })

  const handleStatusChange = async (newStatus: 'UPCOMING' | 'ACTIVE' | 'COMPLETED') => {
    try {
      await updateStatusMutation.mutateAsync({
        id: tournament.id,
        status: newStatus,
      })
    } catch (error) {
      console.error('Failed to update tournament status:', error)
    }
  }

  const canChangeToActive = tournament.status === 'UPCOMING'
  const canChangeToCompleted = tournament.status === 'ACTIVE'
  const canUploadResults = tournament.status === 'ACTIVE' || tournament.status === 'COMPLETED'

  return (
    <div className="tournament-management">
      <div className="management-header">
        <h2>Tournament Management</h2>
        <div className="management-tabs">
          <button
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            Upload Results
          </button>
          <button
            className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>
      </div>

      <div className="management-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="status-management">
              <h3>Tournament Status</h3>
              <div className="current-status">
                <span className="status-label">Current Status:</span>
                <span className={`status-badge ${tournament.status.toLowerCase()}`}>
                  {tournament.status}
                </span>
              </div>

              <div className="status-actions">
                {canChangeToActive && (
                  <button
                    onClick={() => handleStatusChange('ACTIVE')}
                    disabled={updateStatusMutation.isPending}
                    className="status-action-btn start-tournament"
                  >
                    {updateStatusMutation.isPending ? 'Starting...' : 'Start Tournament'}
                  </button>
                )}

                {canChangeToCompleted && (
                  <button
                    onClick={() => handleStatusChange('COMPLETED')}
                    disabled={updateStatusMutation.isPending}
                    className="status-action-btn complete-tournament"
                  >
                    {updateStatusMutation.isPending ? 'Completing...' : 'Complete Tournament'}
                  </button>
                )}
              </div>

              {updateStatusMutation.error && (
                <div className="error-message">
                  Error: {updateStatusMutation.error.message}
                </div>
              )}
            </div>

            <div className="tournament-stats">
              <h3>Tournament Statistics</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{tournament.participants?.length || 0}</div>
                  <div className="stat-label">Participants</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{tournament.matchCount}</div>
                  <div className="stat-label">Matches</div>
                </div>
              </div>
            </div>

            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="action-buttons">
                <button
                  onClick={() => setActiveTab('upload')}
                  disabled={!canUploadResults}
                  className="action-btn upload-results"
                >
                  Upload Results
                </button>
                <button
                  onClick={() => window.print()}
                  className="action-btn print-pairings"
                >
                  Print Pairings
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="upload-tab">
            <TournamentUploadInterface tournament={tournament} />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-tab">
            <div className="tournament-settings">
              <h3>Tournament Settings</h3>
              <div className="settings-info">
                <p>Tournament settings and advanced management options will be available here.</p>
                <div className="setting-item">
                  <label>Tournament ID:</label>
                  <code>{tournament.id}</code>
                </div>
                <div className="setting-item">
                  <label>Created:</label>
                  <span>{new Date(tournament.date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="danger-zone">
              <h3>Danger Zone</h3>
              <div className="danger-actions">
                <button
                  className="danger-btn"
                  onClick={() => {
                    if (confirm('Are you sure you want to reset all match results? This action cannot be undone.')) {
                      // TODO: Implement reset functionality
                      alert('Reset functionality will be implemented in a future update.')
                    }
                  }}
                >
                  Reset All Results
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}