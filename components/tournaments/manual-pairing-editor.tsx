'use client'

import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FormCombobox, FormInput, FormStatus } from '@/components/ui/form-components'
import { 
  AlertCircle, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Users, 
  Shuffle,
  GripVertical,
  CheckCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ApiTournament } from '@/lib/types/api'

interface ManualPairingEditorProps {
  tournament: ApiTournament
  currentRound: number
  onCreatePairings: (pairings: Array<{ player1Id: string; player2Id: string; table?: number }>) => Promise<void>
  onUpdatePairing: (matchId: string, updates: { player1Id?: string; player2Id?: string; table?: number }) => Promise<void>
  onDeletePairing: (matchId: string) => Promise<void>
  onGenerateAutomaticPairings: () => Promise<void>
  isLoading?: boolean
}

interface PairingFormData {
  player1Id: string
  player2Id: string
  table?: number
}

interface EditingPairing {
  matchId: string
  player1Id: string
  player2Id: string
  table?: number
}

interface ValidationError {
  type: 'duplicate' | 'same-player' | 'unavailable' | 'missing-player'
  message: string
  pairingIndex?: number
}

export function ManualPairingEditor({
  tournament,
  currentRound,
  onCreatePairings,
  onUpdatePairing,
  onDeletePairing,
  onGenerateAutomaticPairings,
  isLoading = false
}: ManualPairingEditorProps) {
  // State for new pairing form
  const [newPairing, setNewPairing] = useState<PairingFormData>({
    player1Id: '',
    player2Id: '',
    table: undefined
  })

  // State for editing existing pairings
  const [editingPairing, setEditingPairing] = useState<EditingPairing | null>(null)

  // State for batch pairing creation
  const [batchPairings, setBatchPairings] = useState<PairingFormData[]>([])

  // State for drag and drop
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // UI state
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])

  // Get current round matches
  const currentRoundMatches = useMemo(() => {
    return tournament.matches?.filter(match => match.round === currentRound && match.status === 'PENDING') || []
  }, [tournament.matches, currentRound])

  // Get available players (registered, not dropped, not already paired in current round)
  const availablePlayers = useMemo(() => {
    const pairedPlayerIds = new Set(
      currentRoundMatches.flatMap(match => [match.player1.id, match.player2.id])
    )

    return tournament.participants?.filter(participant => {
      // Check if player is already paired in current round
      if (pairedPlayerIds.has(participant.id)) return false
      
      // For now, assume all participants are available
      // In a full implementation, we would check tournament entry status
      return true
    }) || []
  }, [tournament.participants, currentRoundMatches])

  // Convert players to combobox options
  const playerOptions = useMemo(() => {
    return availablePlayers.map(player => ({
      value: player.id,
      label: player.displayName
    }))
  }, [availablePlayers])

  // Validate pairings
  const validatePairings = useCallback((pairings: PairingFormData[]): ValidationError[] => {
    const errors: ValidationError[] = []
    const usedPlayerIds = new Set<string>()

    pairings.forEach((pairing, index) => {
      // Check if both players are selected
      if (!pairing.player1Id || !pairing.player2Id) {
        errors.push({
          type: 'missing-player',
          message: `Pairing ${index + 1}: Both players must be selected`,
          pairingIndex: index
        })
        return
      }

      // Check if same player selected twice
      if (pairing.player1Id === pairing.player2Id) {
        errors.push({
          type: 'same-player',
          message: `Pairing ${index + 1}: Cannot pair a player with themselves`,
          pairingIndex: index
        })
        return
      }

      // Check if player is already used in another pairing
      if (usedPlayerIds.has(pairing.player1Id)) {
        errors.push({
          type: 'duplicate',
          message: `Pairing ${index + 1}: Player 1 is already paired`,
          pairingIndex: index
        })
      }
      if (usedPlayerIds.has(pairing.player2Id)) {
        errors.push({
          type: 'duplicate',
          message: `Pairing ${index + 1}: Player 2 is already paired`,
          pairingIndex: index
        })
      }

      // Check if players are available
      const player1Available = availablePlayers.some(p => p.id === pairing.player1Id)
      const player2Available = availablePlayers.some(p => p.id === pairing.player2Id)

      if (!player1Available) {
        errors.push({
          type: 'unavailable',
          message: `Pairing ${index + 1}: Player 1 is not available`,
          pairingIndex: index
        })
      }
      if (!player2Available) {
        errors.push({
          type: 'unavailable',
          message: `Pairing ${index + 1}: Player 2 is not available`,
          pairingIndex: index
        })
      }

      usedPlayerIds.add(pairing.player1Id)
      usedPlayerIds.add(pairing.player2Id)
    })

    return errors
  }, [availablePlayers])

  // Add new pairing to batch
  const handleAddPairing = useCallback(() => {
    const errors = validatePairings([newPairing])
    
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    setBatchPairings(prev => [...prev, newPairing])
    setNewPairing({ player1Id: '', player2Id: '', table: undefined })
    setValidationErrors([])
    setSuccessMessage('Pairing added to batch')
    setTimeout(() => setSuccessMessage(''), 3000)
  }, [newPairing, validatePairings])

  // Remove pairing from batch
  const handleRemoveBatchPairing = useCallback((index: number) => {
    setBatchPairings(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Create all batch pairings
  const handleCreateBatchPairings = useCallback(async () => {
    const errors = validatePairings(batchPairings)
    
    if (errors.length > 0) {
      setValidationErrors(errors)
      setErrorMessage('Please fix validation errors before creating pairings')
      return
    }

    try {
      setErrorMessage('')
      setValidationErrors([])
      await onCreatePairings(batchPairings)
      setBatchPairings([])
      setSuccessMessage(`Successfully created ${batchPairings.length} pairing(s)`)
      setTimeout(() => setSuccessMessage(''), 5000)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create pairings')
    }
  }, [batchPairings, validatePairings, onCreatePairings])

  // Start editing a pairing
  const handleStartEdit = useCallback((match: typeof currentRoundMatches[0]) => {
    setEditingPairing({
      matchId: match.id,
      player1Id: match.player1.id,
      player2Id: match.player2.id,
      table: match.table || undefined
    })
  }, [])

  // Cancel editing
  const handleCancelEdit = useCallback(() => {
    setEditingPairing(null)
  }, [])

  // Save edited pairing
  const handleSaveEdit = useCallback(async () => {
    if (!editingPairing) return

    try {
      setErrorMessage('')
      await onUpdatePairing(editingPairing.matchId, {
        player1Id: editingPairing.player1Id,
        player2Id: editingPairing.player2Id,
        table: editingPairing.table
      })
      setEditingPairing(null)
      setSuccessMessage('Pairing updated successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update pairing')
    }
  }, [editingPairing, onUpdatePairing])

  // Delete pairing
  const handleDeletePairing = useCallback(async (matchId: string) => {
    try {
      setErrorMessage('')
      await onDeletePairing(matchId)
      setSuccessMessage('Pairing deleted successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete pairing')
    }
  }, [onDeletePairing])

  // Generate automatic pairings
  const handleGenerateAutomatic = useCallback(async () => {
    try {
      setErrorMessage('')
      await onGenerateAutomaticPairings()
      setSuccessMessage('Automatic pairings generated successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate automatic pairings')
    }
  }, [onGenerateAutomaticPairings])

  // Drag and drop handlers
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    setBatchPairings(prev => {
      const newPairings = [...prev]
      const draggedItem = newPairings[draggedIndex]
      newPairings.splice(draggedIndex, 1)
      newPairings.splice(index, 0, draggedItem)
      return newPairings
    })
    setDraggedIndex(index)
  }, [draggedIndex])

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
  }, [])

  // Get player name by ID
  const getPlayerName = useCallback((playerId: string) => {
    const player = tournament.participants?.find(p => p.id === playerId)
    return player?.displayName || 'Unknown Player'
  }, [tournament.participants])

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Manual Pairing Editor</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Round {currentRound} • {availablePlayers.length} available players • {currentRoundMatches.length} existing pairings
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleGenerateAutomatic}
              disabled={isLoading || availablePlayers.length < 2}
            >
              <Shuffle className="h-4 w-4 mr-2" />
              Generate Automatic Pairings
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Status messages */}
      {(successMessage || errorMessage) && (
        <FormStatus success={successMessage} error={errorMessage} />
      )}

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-destructive font-medium">
                <AlertCircle className="h-4 w-4" />
                <span>Validation Errors</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-destructive">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error.message}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New pairing form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add New Pairing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormCombobox
              label="Player 1"
              placeholder="Select player..."
              value={newPairing.player1Id}
              onValueChange={(value) => setNewPairing(prev => ({ ...prev, player1Id: value }))}
              options={playerOptions}
              disabled={isLoading}
            />
            <FormCombobox
              label="Player 2"
              placeholder="Select player..."
              value={newPairing.player2Id}
              onValueChange={(value) => setNewPairing(prev => ({ ...prev, player2Id: value }))}
              options={playerOptions}
              disabled={isLoading}
            />
            <FormInput
              label="Table (Optional)"
              type="number"
              min={1}
              placeholder="Table number..."
              value={newPairing.table || ''}
              onChange={(e) => setNewPairing(prev => ({ 
                ...prev, 
                table: e.target.value ? parseInt(e.target.value) : undefined 
              }))}
              disabled={isLoading}
            />
          </div>
          <div className="flex justify-end mt-4">
            <Button
              onClick={handleAddPairing}
              disabled={isLoading || !newPairing.player1Id || !newPairing.player2Id}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add to Batch
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Batch pairings list */}
      {batchPairings.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Batch Pairings ({batchPairings.length})</CardTitle>
              <Button
                onClick={handleCreateBatchPairings}
                disabled={isLoading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Create All Pairings
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {batchPairings.map((pairing, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border bg-card",
                    "cursor-move hover:bg-accent/50 transition-colors",
                    draggedIndex === index && "opacity-50"
                  )}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">P1</Badge>
                      <span className="text-sm font-medium">{getPlayerName(pairing.player1Id)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">P2</Badge>
                      <span className="text-sm font-medium">{getPlayerName(pairing.player2Id)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {pairing.table && (
                        <>
                          <Badge variant="secondary">Table {pairing.table}</Badge>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveBatchPairing(index)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current round pairings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Round Pairings</CardTitle>
        </CardHeader>
        <CardContent>
          {currentRoundMatches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No pairings created for this round yet.</p>
              <p className="text-sm mt-1">Add pairings manually or generate them automatically.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentRoundMatches.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  {editingPairing?.matchId === match.id ? (
                    // Edit mode
                    <>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <FormCombobox
                          placeholder="Select player..."
                          value={editingPairing.player1Id}
                          onValueChange={(value) => setEditingPairing(prev => 
                            prev ? { ...prev, player1Id: value } : null
                          )}
                          options={[
                            ...playerOptions,
                            { value: match.player1.id, label: match.player1.displayName }
                          ]}
                          disabled={isLoading}
                        />
                        <FormCombobox
                          placeholder="Select player..."
                          value={editingPairing.player2Id}
                          onValueChange={(value) => setEditingPairing(prev => 
                            prev ? { ...prev, player2Id: value } : null
                          )}
                          options={[
                            ...playerOptions,
                            { value: match.player2.id, label: match.player2.displayName }
                          ]}
                          disabled={isLoading}
                        />
                        <FormInput
                          type="number"
                          min={1}
                          placeholder="Table..."
                          value={editingPairing.table || ''}
                          onChange={(e) => setEditingPairing(prev => 
                            prev ? { 
                              ...prev, 
                              table: e.target.value ? parseInt(e.target.value) : undefined 
                            } : null
                          )}
                          disabled={isLoading}
                        />
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={isLoading}
                        >
                          <Save className="h-4 w-4 text-success" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          disabled={isLoading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    // View mode
                    <>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">P1</Badge>
                          <span className="text-sm font-medium">{match.player1.displayName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">P2</Badge>
                          <span className="text-sm font-medium">{match.player2.displayName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {match.table && (
                            <Badge variant="secondary">Table {match.table}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEdit(match)}
                          disabled={isLoading}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePairing(match.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
