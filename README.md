# Play Rough Rankings

Tournament leaderboard service for local card game tournaments.

## Tech Stack

- **Frontend**: Next.js 14+ with App Router, TypeScript, Pico CSS
- **Backend**: Node.js with TypeScript, tRPC for API layer
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Better Auth (to be configured)
- **Validation**: Zod schemas for runtime validation

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Configure your database URL in `.env`:
```bash
DATABASE_URL="postgresql://username:password@localhost:5432/play_rough_rankings?schema=public"
```

3. Generate Prisma client and sync database schema:
```bash
npm run db:generate
npm run db:push
```

4. Start the development server:
```bash
npm run dev
```

5. Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/trpc/          # tRPC API endpoints
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles with Pico CSS
├── lib/                   # Shared utilities
│   ├── prisma.ts          # Prisma client
│   └── trpc/              # tRPC configuration
├── prisma/                # Database schema and migrations
│   └── schema.prisma      # Prisma schema
└── scripts/               # Utility scripts
    └── verify-setup.js    # Setup verification
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Create and run migrations
- `npm run db:studio` - Open Prisma Studio

## Features

### Core Infrastructure ✅

- [x] Next.js 14+ with TypeScript and App Router
- [x] Prisma ORM with PostgreSQL
- [x] tRPC API with type safety
- [x] Pico CSS with custom theming
- [x] Basic project structure

### Planned Features

- [ ] Better Auth authentication system
- [ ] Player profile management
- [ ] Tournament management
- [ ] File upload for tournament results
- [ ] Real-time leaderboards
- [ ] Game-specific statistics (Pokemon TCG)

## Database Models

The application includes the following core models:

- **Game**: Card game types (Pokemon TCG, etc.)
- **Player**: User profiles with tournament statistics
- **PlayerGameStats**: Game-specific player statistics
- **Store**: Tournament venues
- **Tournament**: Tournament information and metadata
- **Match**: Individual match results

## API Endpoints

The tRPC API provides the following routers:

- `/api/trpc/health` - System health check
- `/api/trpc/games.*` - Game management
- `/api/trpc/players.*` - Player profiles and statistics
- `/api/trpc/tournaments.*` - Tournament management
- `/api/trpc/leaderboards.*` - Ranking and leaderboard data
- `/api/trpc/stores.*` - Store/venue management
- `/api/trpc/uploads.*` - File upload processing

## Development

To verify your setup is correct, run:

```bash
node scripts/verify-setup.js
```

This will check that all required files and dependencies are properly configured.

## License

ISC