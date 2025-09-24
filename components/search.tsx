'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Badge } from './ui/badge'

interface SearchResult {
  id: string
  type: 'tournament' | 'player' | 'store'
  title: string
  subtitle?: string
  href: string
}

interface SearchProps {
  placeholder?: string
  className?: string
  onResultSelect?: (result: SearchResult) => void
}

export function SearchComponent({ 
  placeholder = "Search tournaments, players...", 
  className = "",
  onResultSelect 
}: SearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  // Navigation temporarily disabled pending zustand integration

  // Mock search results - in a real app, this would be an API call
  const mockSearchResults: SearchResult[] = [
    {
      id: '1',
      type: 'tournament',
      title: 'Spring Championship 2024',
      subtitle: 'Pokemon TCG - Standard',
      href: '/tournaments/1'
    },
    {
      id: '2',
      type: 'player',
      title: 'John Doe',
      subtitle: 'Rating: 1850',
      href: '/players/2'
    },
    {
      id: '3',
      type: 'store',
      title: 'Game Haven',
      subtitle: '123 Main St, City',
      href: '/stores/3'
    }
  ]

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Handle search input
  const handleSearch = (value: string) => {
    setQuery(value)
    
    if (value.trim().length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    
    // Simulate API delay
    setTimeout(() => {
      const filteredResults = mockSearchResults.filter(result =>
        result.title.toLowerCase().includes(value.toLowerCase()) ||
        result.subtitle?.toLowerCase().includes(value.toLowerCase())
      )
      setResults(filteredResults)
      setIsOpen(true)
      setIsLoading(false)
    }, 300)
  }

  // Handle result selection
  const handleResultSelect = (result: SearchResult) => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    
    if (onResultSelect) {
      onResultSelect(result)
    } else {
      // router.push(result.href)
    }
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      // Navigate to search results page
      // router.push(`/search?q=${encodeURIComponent(query)}`)
      setQuery('')
      setResults([])
      setIsOpen(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'tournament':
        return '🏆'
      case 'player':
        return '👤'
      case 'store':
        return '🏪'
      default:
        return '🔍'
    }
  }

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'tournament':
        return 'default' as const
      case 'player':
        return 'secondary' as const
      case 'store':
        return 'outline' as const
      default:
        return 'outline' as const
    }
  }

  return (
    <div className={`relative ${className}`} ref={searchRef}>
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            if (results.length > 0) {
              setIsOpen(true)
            }
          }}
          className="pl-10 pr-10 bg-background-light border-gray-200 focus:ring-2 focus:ring-primary-500/20 transition-all duration-200"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 hover:bg-gray-100"
            onClick={() => {
              setQuery('')
              setResults([])
              setIsOpen(false)
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </form>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background-light border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto mb-2"></div>
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultSelect(result)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getTypeIcon(result.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-secondary-500 truncate">
                          {result.title}
                        </p>
                        <Badge variant={getTypeBadgeVariant(result.type)} className="text-xs">
                          {result.type}
                        </Badge>
                      </div>
                      {result.subtitle && (
                        <p className="text-sm text-gray-500 truncate">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : query.trim().length >= 2 ? (
            <div className="p-4 text-center text-gray-500">
              <p>No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-sm mt-1">Try searching for tournaments, players, or stores</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
