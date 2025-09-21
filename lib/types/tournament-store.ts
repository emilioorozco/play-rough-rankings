// Tournament Store specific types

export interface Tournament {
  id: string
  name: string
  description?: string
  game: string
  status: 'upcoming' | 'active' | 'completed' | 'cancelled'
  startDate: Date
  endDate?: Date
  maxPlayers?: number
  currentPlayers: number
  entryFee?: number
  prizePool?: number
  rules?: string
  location?: string
  organizer: {
    id: string
    name: string
    email: string
  }
  createdAt: Date
  updatedAt: Date
}

export interface RegistrationStatus {
  isRegistered: boolean
  registeredAt?: Date
  withdrawnAt?: Date
  position?: number
  maxPlayers?: number
  currentPlayers?: number
  canRegister: boolean
  canWithdraw: boolean
  registrationDeadline?: Date
}

export interface TournamentFilters {
  status?: string[]
  game?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  entryFee?: {
    min: number
    max: number
  }
  location?: string
  organizer?: string
  search?: string
}

export interface TournamentListParams {
  page?: number
  limit?: number
  filters?: TournamentFilters
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface TournamentListResponse {
  tournaments: Tournament[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface TournamentState {
  currentTournament: Tournament | null
  tournamentList: Tournament[]
  registrationStatuses: Record<string, RegistrationStatus>
  filters: TournamentFilters
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  loading: {
    currentTournament: boolean
    tournamentList: boolean
    registrationStatuses: Record<string, boolean>
  }
  errors: {
    currentTournament: Error | null
    tournamentList: Error | null
    registrationStatuses: Record<string, Error | null>
  }
}

export interface TournamentActions {
  fetchTournament: (tournamentId: string) => Promise<Tournament | null>
  fetchTournaments: (params?: TournamentListParams) => Promise<TournamentListResponse | null>
  fetchRegistrationStatus: (tournamentId: string) => Promise<RegistrationStatus | null>
  setCurrentTournament: (tournament: Tournament | null) => void
  setTournaments: (tournaments: Tournament[]) => void
  setRegistrationStatus: (tournamentId: string, status: RegistrationStatus) => void
  addTournament: (tournament: Tournament) => void
  updateTournament: (tournamentId: string, updates: Partial<Tournament>) => void
  removeTournament: (tournamentId: string) => void
  clearCurrentTournament: () => void
  clearTournaments: () => void
  clearRegistrationStatus: (tournamentId: string) => void
  setFilters: (filters: TournamentFilters) => void
  clearFilters: () => void
  invalidateTournament: (tournamentId: string) => void
  invalidateTournamentList: () => void
  invalidateRegistrationStatus: (tournamentId: string) => void
  clearCache: () => void
}

export type TournamentStore = TournamentState & TournamentActions

// Hook return types
export interface UseCurrentTournamentReturn {
  tournament: Tournament | null
  isLoading: boolean
  error: Error | null
  fetch: (tournamentId: string) => Promise<Tournament | null>
  set: (tournament: Tournament | null) => void
  clear: () => void
}

export interface UseTournamentListReturn {
  tournaments: Tournament[]
  isLoading: boolean
  error: Error | null
  pagination: TournamentListResponse['pagination']
  fetch: (params?: TournamentListParams) => Promise<TournamentListResponse | null>
  set: (tournaments: Tournament[]) => void
  add: (tournament: Tournament) => void
  update: (tournamentId: string, updates: Partial<Tournament>) => void
  remove: (tournamentId: string) => void
  clear: () => void
}

export interface UseTournamentRegistrationStatusReturn {
  registrationStatus: RegistrationStatus | null
  isLoading: boolean
  error: Error | null
  fetch: (tournamentId?: string) => Promise<RegistrationStatus | null>
  set: (status: RegistrationStatus) => void
  clear: () => void
}

export interface UseTournamentFiltersReturn {
  filters: TournamentFilters
  set: (filters: TournamentFilters) => void
  clear: () => void
}

export interface UseTournamentCacheReturn {
  invalidate: (tournamentId: string) => void
  invalidateList: () => void
  invalidateRegistration: (tournamentId: string) => void
  clear: () => void
}

export interface UseTournamentStoreActionsReturn {
  fetchTournament: (tournamentId: string) => Promise<Tournament | null>
  fetchTournaments: (params?: TournamentListParams) => Promise<TournamentListResponse | null>
  fetchRegistrationStatus: (tournamentId: string) => Promise<RegistrationStatus | null>
  setCurrentTournament: (tournament: Tournament | null) => void
  setTournaments: (tournaments: Tournament[]) => void
  setRegistrationStatus: (tournamentId: string, status: RegistrationStatus) => void
  addTournament: (tournament: Tournament) => void
  updateTournament: (tournamentId: string, updates: Partial<Tournament>) => void
  removeTournament: (tournamentId: string) => void
  clearCurrentTournament: () => void
  clearTournaments: () => void
  clearRegistrationStatus: (tournamentId: string) => void
  setFilters: (filters: TournamentFilters) => void
  clearFilters: () => void
  invalidateTournament: (tournamentId: string) => void
  invalidateTournamentList: () => void
  invalidateRegistrationStatus: (tournamentId: string) => void
  clearCache: () => void
}

export interface UseTournamentStoreStateReturn {
  currentTournament: Tournament | null
  tournamentList: Tournament[]
  registrationStatuses: Record<string, RegistrationStatus>
  filters: TournamentFilters
  loading: {
    currentTournament: boolean
    tournamentList: boolean
    registrationStatuses: Record<string, boolean>
  }
  errors: {
    currentTournament: Error | null
    tournamentList: Error | null
    registrationStatuses: Record<string, Error | null>
  }
}
