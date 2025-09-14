'use client'

import { trpc } from '@/lib/trpc/client'
import { useState, useEffect } from 'react'

interface TournamentFiltersProps {
  filters: {
    gameId: string
    storeId: string
    status: string
    startDate: string
    endDate: string
    search: string
  }
  onFiltersChange: (filters: {
    gameId: string
    storeId: string
    status: string
    startDate: string
    endDate: string
    search: string
  }) => void
}

export function TournamentFilters({ filters, onFiltersChange }: TournamentFiltersProps) {
  const gamesQuery = trpc.games.list.useQuery({ includeInactive: false })
  const storesQuery = trpc.stores.list.useQuery({ includeInactive: false })

  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  const clearFilters = () => {
    onFiltersChange({
      gameId: '',
      storeId: '',
      status: '',
      startDate: '',
      endDate: '',
      search: '',
    })
  }

  return (
    <div className="tournament-filters">
      <div className="filter-header">
        <h3>Filter Tournaments</h3>
        <button 
          type="button" 
          onClick={clearFilters}
          className="clear-filters-btn"
        >
          Clear All
        </button>
      </div>

      <div className="filter-group">
        <label htmlFor="search">Search</label>
        <input
          id="search"
          type="text"
          placeholder="Tournament name..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label htmlFor="game">Game</label>
        <select
          id="game"
          value={filters.gameId}
          onChange={(e) => handleFilterChange('gameId', e.target.value)}
        >
          <option value="">All Games</option>
          {gamesQuery.data?.map((game) => (
            <option key={game.id} value={game.id}>
              {game.name} ({game.shortName})
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="store">Store</label>
        <select
          id="store"
          value={filters.storeId}
          onChange={(e) => handleFilterChange('storeId', e.target.value)}
        >
          <option value="">All Stores</option>
          {storesQuery.data?.stores?.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name} - {store.city}, {store.state}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="status">Status</label>
        <select
          id="status"
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="UPCOMING">Upcoming</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="startDate">Start Date</label>
        <input
          id="startDate"
          type="date"
          value={filters.startDate}
          onChange={(e) => handleFilterChange('startDate', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label htmlFor="endDate">End Date</label>
        <input
          id="endDate"
          type="date"
          value={filters.endDate}
          onChange={(e) => handleFilterChange('endDate', e.target.value)}
        />
      </div>
    </div>
  )
}