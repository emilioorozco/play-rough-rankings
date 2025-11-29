'use client'

import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import type { ApiTournament } from '@/lib/types/api'
import { Download } from 'lucide-react'

interface TournamentManagementProps {
  isOpen: boolean
  onClose: () => void
  tournament: ApiTournament
  onUpdate: (updatedTournament: ApiTournament) => void
}

export function TournamentManagement({ 
  isOpen,
  onClose, 
  tournament,
  onUpdate 
}: TournamentManagementProps) {

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Tournament"
      size="md"
    >
      <div className="text-center py-8">
        <h3 className="text-lg font-semibold mb-2 text-secondary-500">
          Tournament Management
        </h3>
        <p className="text-gray-500 mb-6">
          Tournament management tools will be implemented here.
        </p>

        {/* Admin/TO-only actions (gated by access to this modal) */}
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Data &amp; exports</p>
            <Button
              variant="outline"
              className="flex items-center gap-2 w-full sm:w-auto justify-center"
              // TODO: Wire up actual download behavior (e.g. CSV, pairings, results)
              onClick={() => {
                // Placeholder for now so the action is gated inside this modal
                console.log('Download tournament data not yet implemented', tournament.id)
              }}
            >
              <Download className="h-4 w-4" />
              Download tournament data
            </Button>
          </div>

          <div className="flex gap-2 justify-center pt-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => onUpdate(tournament)}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
