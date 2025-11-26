import type { ApiTournament } from '@/lib/types/api'

const LATE_REGISTRATION_STRUCTURES = new Set(['SWISS'])

export interface TournamentRegistrationState {
  label: string
  canRegister: boolean
  reason?: string
  isLateRegistration?: boolean
  isFull?: boolean
}

type TournamentLike = Pick<ApiTournament, 'status' | 'maxPlayers'> & {
  tournamentStructure?: string | null
  registrationDeadline?: string | Date | null
  participantCount?: number | null
  participants?: Array<unknown>
  totalRounds?: number | null
  matches?: Array<{ round: number }>
}

const normalizeStructure = (structure?: string | null) =>
  (structure?.toUpperCase?.() || 'SWISS').trim()

const getParticipantCount = (tournament: TournamentLike) => {
  if (typeof tournament.participantCount === 'number') {
    return tournament.participantCount
  }
  if (Array.isArray(tournament.participants)) {
    return tournament.participants.length
  }
  return 0
}

const isTournamentFull = (tournament: TournamentLike, participantCount: number) => {
  if (typeof tournament.maxPlayers !== 'number' || tournament.maxPlayers <= 0) {
    return false
  }

  return participantCount >= tournament.maxPlayers
}

export function getTournamentRegistrationState(
  tournament: TournamentLike,
  options?: { now?: Date }
): TournamentRegistrationState {
  const now = options?.now ?? new Date()
  const participantCount = getParticipantCount(tournament)
  const isFull = isTournamentFull(tournament, participantCount)
  const structure = normalizeStructure(tournament.tournamentStructure)
  const allowsLateRegistration = LATE_REGISTRATION_STRUCTURES.has(structure)

  const deadline = tournament.registrationDeadline
    ? new Date(tournament.registrationDeadline)
    : null
  const deadlinePassed = deadline ? now > deadline : false

  const buildState = (
    label: string,
    canRegister: boolean,
    extra?: Partial<TournamentRegistrationState>
  ): TournamentRegistrationState => ({
    label,
    canRegister,
    isLateRegistration: false,
    isFull,
    ...extra,
  })

  switch (tournament.status) {
    case 'CANCELLED':
      return buildState('Cancelled', false, {
        reason: 'Tournament has been cancelled.',
      })
    case 'COMPLETED':
      return buildState('Completed', false, {
        reason: 'Tournament already completed.',
      })
  }

  if (isFull) {
    return buildState('Full', false, {
      reason: 'Participant cap has been reached.',
    })
  }

  if (tournament.status === 'UPCOMING') {
    if (deadlinePassed) {
      return buildState('Closed', false, {
        reason: 'Registration deadline has passed.',
      })
    }

    return buildState('Open', true)
  }

  if (tournament.status === 'ACTIVE' || tournament.status === 'PAUSED') {
    // Check if tournament is on the last round
    const isOnLastRound = () => {
      if (!tournament.totalRounds || !tournament.matches || tournament.matches.length === 0) {
        return false
      }
      const currentRound = Math.max(...tournament.matches.map(m => m.round))
      return currentRound >= tournament.totalRounds
    }

    // Disable registration if on the last round
    if (isOnLastRound()) {
      return buildState('Closed', false, {
        reason: 'Tournament is on the final round. Registration is closed.',
      })
    }

    if (allowsLateRegistration) {
      return buildState('Late Registration', true, {
        isLateRegistration: true,
      })
    }

    return buildState('Closed', false, {
      reason: 'Elimination bracket already underway.',
    })
  }

  return buildState('Closed', false)
}

