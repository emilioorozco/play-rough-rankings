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
    <div className="container">
      <header className="page-header">
        <h1>Tournaments</h1>
        <p>Browse and search local card game tournaments</p>
      </header>

      <div className="tournaments-layout">
        <aside className="filters-sidebar">
          <TournamentFilters 
            filters={filters} 
            onFiltersChange={setFilters} 
          />
        </aside>
        
        <main className="tournaments-content">
          <TournamentList filters={filters} />
        </main>
      </div>
    </div>
  )
}