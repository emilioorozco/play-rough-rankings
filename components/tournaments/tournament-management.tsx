'use client'

import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import type { ApiTournament } from '@/lib/types/api'
import { useModal } from '@/stores/ui-store'

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
  // Use UI store for modal management
  const modal = useModal('tournamentManagement')

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
        <p className="text-gray-500 mb-4">
          Tournament management tools will be implemented here.
        </p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => onUpdate(tournament)}>
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  )
}
