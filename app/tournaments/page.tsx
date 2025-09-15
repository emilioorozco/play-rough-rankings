'use client'

import { TournamentList } from '@/components/tournaments/tournament-list'
import { TournamentFilters } from '@/components/tournaments/tournament-filters'
import { useState } from 'react'

export default function TournamentsPage() {
  const [filters, setFilters] = useState({
    gameId: '',
    storeId: '',
    status: '',
    startDate: '',
    endDate: '',
    search: '',
  })

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-secondary-500 mb-2">Tournaments</h1>
        <p className="text-gray-500 text-sm sm:text-base px-2">Browse and search local card game tournaments</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
        <aside className="lg:col-span-1 order-2 lg:order-1">
          <TournamentFilters 
            filters={filters} 
            onFiltersChange={setFilters} 
          />
        </aside>
        
        <main className="lg:col-span-3 order-1 lg:order-2">
          <TournamentList filters={filters} />
        </main>
      </div>
    </div>
  )
}