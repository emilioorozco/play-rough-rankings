'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { PlayerComparison } from '@/components/leaderboards/player-comparison'
import { PlayerCard } from '@/components/player/player-card'

export default function PlayersPage() {
  const [selectedGameId, setSelectedGameId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'search' | 'compare'>('search')

  // Get available games
  const { data: games, isLoading: gamesLoading } = trpc.games.list.useQuery({
    includeInactive: false,
  })

  // Search for players
  const { data: searchResults, isLoading: searchLoading } = trpc.players.searchPlayers.useQuery(
    {
      query: searchQuery,
      gameId: selectedGameId || undefined,
      limit: 20,
    },
    {
      enabled: searchQuery.length >= 2,
      refetchOnWindowFocus: false,
    }
  )


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-secondary-500 mb-2">Player Directory</h1>
        <p className="text-gray-500 text-sm sm:text-base px-4">Search for players, view profiles, and compare performance across games</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit mx-auto max-w-sm sm:max-w-none">
          <button
            className={`px-4 sm:px-6 py-3 rounded-md font-medium transition-all duration-200 flex items-center flex-1 sm:flex-none ${
              activeTab === 'search' 
                ? 'bg-white text-secondary-500 shadow-sm' 
                : 'text-gray-500 hover:text-secondary-500'
            }`}
            onClick={() => setActiveTab('search')}
          >
            <span className="mr-2">🔍</span>
            <span className="hidden sm:inline">Search</span>
            <span className="sm:hidden">Search</span>
          </button>
          <button
            className={`px-4 sm:px-6 py-3 rounded-md font-medium transition-all duration-200 flex items-center flex-1 sm:flex-none ${
              activeTab === 'compare' 
                ? 'bg-white text-secondary-500 shadow-sm' 
                : 'text-gray-500 hover:text-secondary-500'
            }`}
            onClick={() => setActiveTab('compare')}
          >
            <span className="mr-2">⚖️</span>
            <span className="hidden sm:inline">Compare</span>
            <span className="sm:hidden">Compare</span>
          </button>
        </div>
      </div>

      {/* Game Filter */}
      <div className="mb-6">
        <div className="max-w-sm sm:max-w-md mx-auto">
          <label htmlFor="game-filter" className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Game (Optional)
          </label>
          <select
            id="game-filter"
            value={selectedGameId}
            onChange={(e) => setSelectedGameId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Games</option>
            {gamesLoading ? (
              <option disabled>Loading games...</option>
            ) : (
              games?.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))
            )}
          </select>
          <p className="text-xs text-gray-500 mt-1 text-center sm:text-left">
            {selectedGameId ? `Showing players for ${games?.find(g => g.id === selectedGameId)?.name}` : 'Showing players from all games'}
          </p>
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'search' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-semibold text-secondary-500 mb-4">Search Players</h2>
              <div className="max-w-sm sm:max-w-md mx-auto">
                <input
                  type="text"
                  placeholder="Enter player name to search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-center sm:text-left"
                />
                <p className="text-sm text-gray-500 mt-2 px-2">
                  Type at least 2 characters to search. Results will be filtered by the selected game if specified.
                </p>
              </div>
            </div>

            {searchQuery.length < 2 ? (
              <div className="text-center py-12">
                <h3 className="text-xl font-semibold text-secondary-500 mb-2">Start Searching</h3>
                <p className="text-gray-500 mb-6">Enter a player name above to find players and view their profiles.</p>
                <div className="max-w-md mx-auto text-left">
                  <h4 className="font-medium text-gray-700 mb-3">What you can do:</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-primary-500 rounded-full mr-3"></span>
                      Search by player display name or username
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-primary-500 rounded-full mr-3"></span>
                      View detailed player profiles and statistics
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-primary-500 rounded-full mr-3"></span>
                      Compare players across different games
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-primary-500 rounded-full mr-3"></span>
                      Track player performance over time
                    </li>
                  </ul>
                </div>
              </div>
            ) : searchLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
                <p className="text-gray-500">Searching for players...</p>
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div>
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-secondary-500 mb-2">
                    Found {searchResults.length} player{searchResults.length !== 1 ? 's' : ''}
                  </h3>
                  <p className="text-gray-500">
                    {selectedGameId ? `in ${games?.find(g => g.id === selectedGameId)?.name}` : 'across all games'}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {searchResults.map((player) => (
                    <PlayerCard
                      key={player.id}
                      player={{
                        ...player,
                        displayName: player.displayName || 'Unknown Player',
                        userName: player.userName || undefined
                      }}
                      gameId={selectedGameId}
                      rank={undefined}
                      showActions={true}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-xl font-semibold text-secondary-500 mb-2">No Players Found</h3>
                <p className="text-gray-500 mb-6">No players match your search criteria.</p>
                <div className="max-w-md mx-auto text-left">
                  <h4 className="font-medium text-gray-700 mb-3">Try:</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                      Checking your spelling
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                      Removing the game filter to search all games
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                      Searching for part of the player&apos;s name
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'compare' && (
          <div>
            {selectedGameId ? (
              <PlayerComparison gameId={selectedGameId} />
            ) : (
              <div className="text-center py-12">
                <h2 className="text-2xl font-semibold text-secondary-500 mb-4">Player Comparison</h2>
                <p className="text-gray-500 mb-6">Select a game above to start comparing players.</p>
                <div className="max-w-md mx-auto text-left">
                  <h3 className="font-medium text-gray-700 mb-3">Comparison Features:</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-primary-500 rounded-full mr-3"></span>
                      Compare up to 4 players side by side
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-primary-500 rounded-full mr-3"></span>
                      View ratings, win rates, and tournament statistics
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-primary-500 rounded-full mr-3"></span>
                      See rankings within your comparison group
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-primary-500 rounded-full mr-3"></span>
                      Analyze performance differences
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}