# Deck Tracking Implementation

This document outlines the implementation of deck tracking functionality for the tournament leaderboard system.

## Overview

The deck tracking system allows you to:
- Track which deck each player used in each tournament
- Analyze deck popularity and win rates
- View player deck preferences and performance
- Generate deck meta statistics

## Database Schema Changes

### New Tables

#### `decks`
- `id`: Unique identifier
- `name`: Deck name (e.g., "Charizard ex Control", "Miraidon ex")
- `archetype`: Deck archetype (e.g., "Control", "Aggro", "Combo")
- `gameId`: Links to the game this deck belongs to
- `format`: Tournament format (e.g., "Standard", "Expanded")
- `description`: Optional deck description
- `metadata`: JSON field for deck-specific data (key cards, colors, etc.)
- `isActive`: Whether the deck is currently active/legal

#### `tournament_entries`
- `id`: Unique identifier
- `tournamentId`: Links to the tournament
- `playerId`: Links to the player
- `deckId`: Links to the deck used (optional)
- `placement`: Final tournament placement
- `record`: JSON field with wins/losses/draws for this tournament
- `metadata`: Additional tournament-specific data

### Constraints
- Unique constraint on `(name, gameId, format)` for decks
- Unique constraint on `(tournamentId, playerId)` for tournament entries

## API Endpoints

### Decks Router (`/api/trpc/decks`)

#### `list`
- Get all decks for a game with optional filtering
- Includes usage statistics
- **Input**: `gameId`, `format?`, `archetype?`, `includeInactive?`, `limit?`

#### `getById`
- Get detailed deck information with usage statistics
- **Input**: `id`, `includeStats?`

#### `create`
- Create a new deck (organizers/admins only)
- **Input**: `CreateDeckSchema`

#### `update`
- Update deck information (organizers/admins only)
- **Input**: `id`, `UpdateDeckSchema`

#### `getStats`
- Get comprehensive deck statistics and usage trends
- **Input**: `DeckStatsQuerySchema`

#### `getUsage`
- Get specific deck usage by players
- **Input**: `DeckUsageQuerySchema`

#### `getArchetypes`
- Get popular archetypes for a game/format
- **Input**: `gameId`, `format?`, `season?`, `limit?`

### Tournament Entries Router (`/api/trpc/tournamentEntries`)

#### `getByTournament`
- Get all entries for a tournament with deck information
- **Input**: `tournamentId`, `includeDeckInfo?`

#### `getByPlayer`
- Get tournament entries for a specific player
- **Input**: `playerId`, `gameId?`, `includeDeckInfo?`, `limit?`

#### `create`
- Create a tournament entry (organizers/admins only)
- **Input**: `CreateTournamentEntrySchema`

#### `update`
- Update tournament entry (organizers/admins only)
- **Input**: `id`, `UpdateTournamentEntrySchema`

#### `bulkCreate`
- Create multiple tournament entries at once
- **Input**: `tournamentId`, `entries[]`

### Enhanced Leaderboards Router

#### `getRankingStats`
- Now includes popular decks for the season
- Shows top 5 most used decks with usage counts

#### `getPlayerDeckStats`
- Get deck usage statistics for a specific player
- Shows which decks they've used, win rates, and frequency
- **Input**: `playerId`, `gameId`, `season?`

## Usage Examples

### Creating a Deck
```typescript
const deck = await trpc.decks.create.mutate({
  name: "Charizard ex Control",
  archetype: "Control",
  gameId: "pokemon-tcg-id",
  format: "Standard",
  description: "Control deck featuring Charizard ex",
  metadata: {
    keyCards: ["Charizard ex", "Professor's Research"],
    colors: ["Fire", "Colorless"]
  }
})
```

### Recording Tournament Entry with Deck
```typescript
const entry = await trpc.tournamentEntries.create.mutate({
  tournamentId: "tournament-id",
  playerId: "player-id",
  deckId: "charizard-deck-id",
  record: {
    wins: 5,
    losses: 2,
    draws: 0
  }
})
```

### Getting Deck Statistics
```typescript
const deckStats = await trpc.decks.getStats.query({
  gameId: "pokemon-tcg-id",
  format: "Standard",
  season: "2024-Q1",
  minUsage: 5
})
```

### Getting Player Deck Usage
```typescript
const playerDecks = await trpc.leaderboards.getPlayerDeckStats.query({
  playerId: "player-id",
  gameId: "pokemon-tcg-id",
  season: "2024-Q1"
})
```

## Statistics Tracked

### Deck-Level Statistics
- **Usage Count**: How many times the deck was played
- **Win Rate**: Overall win percentage across all tournaments
- **Unique Players**: Number of different players who used the deck
- **Tournament Count**: Number of tournaments the deck appeared in
- **Record**: Total wins, losses, and draws

### Archetype-Level Statistics
- **Usage**: Total times any deck of this archetype was played
- **Unique Decks**: Number of different deck variants in the archetype
- **Win Rate**: Combined win rate across all decks in the archetype

### Player-Level Deck Statistics
- **Deck Preferences**: Which decks a player uses most often
- **Deck Performance**: Win rates with specific decks
- **Deck Diversity**: How many different decks a player has used
- **Recent Usage**: Most recently used decks

## Privacy Considerations

- Only public player profiles show deck information
- Private players appear as "Private Player" in deck usage statistics
- Deck statistics only include data from public players

## Integration with Existing Systems

### Match Processing
- Tournament entries can be created when processing tournament files
- Deck information can be included in uploaded tournament data
- Win/loss records are automatically calculated from match results

### Leaderboard System
- Rankings now include popular deck information
- Player profiles can show deck usage statistics
- Seasonal statistics include deck meta information

### File Upload System
- Tournament files can include deck information
- Parsers can extract deck names and map them to existing decks
- New decks can be created automatically during file processing

## Future Enhancements

1. **Deck Similarity Analysis**: Compare decks based on key cards
2. **Meta Tracking**: Track how the meta evolves over time
3. **Matchup Analysis**: Win rates between specific deck matchups
4. **Deck Recommendations**: Suggest decks based on player history
5. **Advanced Filtering**: Filter leaderboards by deck archetype
6. **Deck Popularity Trends**: Track deck usage over time
7. **Tournament Format Analysis**: Compare deck performance across formats

## Migration Notes

To implement this system:

1. Run the database migration to create the new tables
2. Update your Prisma client: `npx prisma generate`
3. The new API endpoints are immediately available
4. Existing tournaments won't have deck data until manually added
5. Consider creating seed data for common decks in your game

## Performance Considerations

- Deck statistics are calculated on-demand but could be cached
- Large tournaments with many entries may need pagination
- Consider indexing frequently queried fields like `gameId`, `format`, and `archetype`
- The ranking cache system helps reduce database load for popular queries