'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import type { ApiGame } from '@/lib/types/api'

interface ExternalPlayerIdManagerProps {
  playerId: string
  externalPlayerIds: Record<string, string>
  games: ApiGame[]
}

export function ExternalPlayerIdManager({ 
  externalPlayerIds, 
  games 
}: ExternalPlayerIdManagerProps) {
  const [editingGameId, setEditingGameId] = useState<string | null>(null)
  const [newExternalId, setNewExternalId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Mutations for managing external player IDs
  const setExternalIdMutation = trpc.players.setExternalPlayerId.useMutation({
    onSuccess: () => {
      setSuccess('External player ID updated successfully!')
      setEditingGameId(null)
      setNewExternalId('')
      setError(null)
    },
    onError: (error) => {
      setError(error.message)
      setSuccess(null)
    },
  })

  const removeExternalIdMutation = trpc.players.removeExternalPlayerId.useMutation({
    onSuccess: () => {
      setSuccess('External player ID removed successfully!')
      setError(null)
    },
    onError: (error) => {
      setError(error.message)
      setSuccess(null)
    },
  })

  const handleSaveExternalId = async (gameId: string) => {
    if (!newExternalId.trim()) {
      setError('Please enter a valid external player ID')
      return
    }

    try {
      await setExternalIdMutation.mutateAsync({
        gameId,
        externalId: newExternalId.trim(),
      })
    } catch {}
  }

  const handleRemoveExternalId = async (gameId: string) => {
    if (window.confirm('Are you sure you want to remove this external player ID?')) {
      try {
        await removeExternalIdMutation.mutateAsync({ gameId })
      } catch {}
    }
  }

  const handleCancelEdit = () => {
    setEditingGameId(null)
    setNewExternalId('')
    setError(null)
  }

  const startEditing = (gameId: string, currentId?: string) => {
    setEditingGameId(gameId)
    setNewExternalId(currentId || '')
    setError(null)
    setSuccess(null)
  }

  const getGameExampleId = (gameName: string) => {
    switch (gameName) {
      case 'POKEMON_TCG':
        return 'e.g., PTC123456'
      default:
        return 'e.g., PLAYER123'
    }
  }

  const getGameDescription = (gameName: string) => {
    switch (gameName) {
      case 'POKEMON_TCG':
        return 'Your Pokémon TCG Player ID from the official tournament system'
      default:
        return 'Your player ID from the official tournament system'
    }
  }

  return (
    <div className="external-id-manager">
      <header className="manager-header mb-4">
        <h3>External Player IDs</h3>
        <p>
          Link your official player IDs from different game systems to automatically 
          match tournament results with your profile.
        </p>
      </header>

      {/* Status Messages */}
      {error && (
        <div className="error-message mb-3">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message mb-3">
          {success}
        </div>
      )}

      {/* Games List */}
      <div className="games-list">
        {games.length === 0 ? (
          <div className="no-games">
            <p className="text-muted">No games are currently available.</p>
          </div>
        ) : (
          games.map((game) => {
            const currentExternalId = externalPlayerIds[game.id]
            const isEditing = editingGameId === game.id
            const isLoading = setExternalIdMutation.isPending || removeExternalIdMutation.isPending

            return (
              <div key={game.id} className="game-id-card">
                <div className="game-info">
                  <div className="game-header">
                    <h4>{game.name.replace('_', ' ')}</h4>
                    <span className="game-short-name">{game.shortName}</span>
                  </div>
                  <p className="game-description">
                    {getGameDescription(game.name)}
                  </p>
                </div>

                <div className="id-management">
                  {isEditing ? (
                    <div className="edit-form">
                      <div className="input-group">
                        <label htmlFor={`external-id-${game.id}`}>
                          External Player ID
                        </label>
                        <input
                          id={`external-id-${game.id}`}
                          type="text"
                          value={newExternalId}
                          onChange={(e) => setNewExternalId(e.target.value)}
                          placeholder={getGameExampleId(game.name)}
                          disabled={isLoading}
                          maxLength={50}
                        />
                        <small>
                          Enter your official player ID for {game.name.replace('_', ' ')}
                        </small>
                      </div>

                      <div className="form-actions">
                        <button
                          type="button"
                          onClick={() => handleSaveExternalId(game.id)}
                          disabled={isLoading || !newExternalId.trim()}
                        >
                          {isLoading ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          className="outline"
                          onClick={handleCancelEdit}
                          disabled={isLoading}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="display-form">
                      {currentExternalId ? (
                        <div className="current-id">
                          <div className="id-display">
                            <label>Current ID</label>
                            <span className="external-id-value">{currentExternalId}</span>
                          </div>
                          <div className="id-actions">
                            <button
                              type="button"
                              className="outline"
                              onClick={() => startEditing(game.id, currentExternalId)}
                              disabled={isLoading}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="outline secondary"
                              onClick={() => handleRemoveExternalId(game.id)}
                              disabled={isLoading}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="no-id">
                          <p className="text-muted">No external player ID set</p>
                          <button
                            type="button"
                            onClick={() => startEditing(game.id)}
                            disabled={isLoading}
                          >
                            Add Player ID
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Information Section */}
      <div className="info-section mt-4">
        <h4>Why Link External Player IDs?</h4>
        <div className="info-content">
          <ul>
            <li>
              <strong>Automatic Tournament Matching:</strong> When organizers upload tournament 
              results, your games will be automatically linked to your profile.
            </li>
            <li>
              <strong>Accurate Statistics:</strong> Ensure all your tournament results are 
              properly attributed to your account.
            </li>
            <li>
              <strong>Leaderboard Inclusion:</strong> Your official tournament results will 
              count towards seasonal rankings and leaderboards.
            </li>
            <li>
              <strong>Privacy Control:</strong> You can still control who sees your statistics 
              through your privacy settings.
            </li>
          </ul>
        </div>
      </div>

      {/* Security Notice */}
      <div className="security-notice mt-3">
        <h5>🔒 Privacy & Security</h5>
        <p>
          Your external player IDs are used only for tournament result matching and are not 
          displayed publicly. They are stored securely and can be removed at any time.
        </p>
      </div>
    </div>
  )
}