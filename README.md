# Play Rough Rankings

A comprehensive tournament leaderboard service for local card game tournaments, built with modern web technologies and designed for scalability, performance, and user experience.

## 🎯 Overview

Play Rough Rankings is a full-stack tournament management system that provides:

- **Tournament Management**: Complete lifecycle management from creation to completion
- **Player Profiles**: Comprehensive player statistics with ELO rating systems
- **Leaderboards**: Real-time rankings with seasonal and format-specific filtering
- **Multi-Game Support**: Extensible game system supporting various card games
- **OAuth Authentication**: Secure authentication with Google, Discord, and Apple
- **File Processing**: CSV/Excel tournament result processing and validation
- **Store Management**: Venue management for tournament organization
- **Privacy Controls**: Granular user preferences and profile visibility settings

## 🚀 Tech Stack

### Frontend
- **Next.js 15+** with App Router for modern React development
- **React 19** with TypeScript for type-safe component development
- **Tailwind CSS** with shadcn/ui for consistent, accessible design system
- **Zustand** for client-side state management (UI state, forms, preferences)
- **TanStack Query** (via tRPC) for server state management and caching

### Backend
- **Node.js** with TypeScript for type-safe server development
- **tRPC** for end-to-end type safety and efficient API communication
- **Better Auth** for secure authentication with multiple OAuth providers
- **Prisma ORM** with PostgreSQL for robust database operations
- **Zod** for runtime validation and type inference

### Development & Testing
- **Jest** with comprehensive testing strategy (Unit, Integration, Component tests)
- **Testing Library** for React component testing
- **MSW** for API mocking in tests
- **ESLint** with Next.js flat config for modern code quality standards
- **TypeScript** for type safety across the entire stack

### Database & Storage
- **PostgreSQL** for reliable data persistence
- **Prisma Migrations** for database schema management
- **File Upload** support for tournament result processing

## 📋 Prerequisites

- **Node.js 18+** (recommended: Node.js 20+)
- **PostgreSQL 14+** database
- **npm** or **yarn** package manager
- **Git** for version control

### Optional OAuth Providers
- **Google OAuth** credentials for Google Sign-In
- **Discord OAuth** credentials for Discord authentication
- **Apple OAuth** credentials for Apple Sign-In

## 🛠️ Installation & Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd leaderboard-service
npm install
```

**Note**: The project uses ESLint flat config format with `eslint.config.mjs` for modern ESLint configuration compatible with Next.js 15+.

### 2. Environment Configuration

Create a `.env` file in the root directory:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/play_rough_rankings?schema=public"

# Authentication Configuration
BETTER_AUTH_SECRET="your-32-character-hex-secret"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# OAuth Provider Configuration (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
DISCORD_CLIENT_ID="your-discord-client-id"
DISCORD_CLIENT_SECRET="your-discord-client-secret"
APPLE_CLIENT_ID="your-apple-client-id"
APPLE_CLIENT_SECRET="your-apple-client-secret"

# Test Database (for testing)
TEST_DATABASE_URL="postgresql://test:test@localhost:5432/test_leaderboard"
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# (Optional) Open Prisma Studio to explore data
npm run db:studio
```

### 4. Development Server

```bash
# Start development server
npm run dev

# Alternative: Smart development with automatic environment detection
npm run dev:smart

# For localhost-only development
npm run dev:localhost
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

### 5. Verify Setup

```bash
# Run setup verification script
node scripts/verify-setup.js
```

## 🧪 Testing

The project includes a comprehensive testing strategy with multiple layers:

### Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests for CI/CD (no watch mode)
npm run test:ci
```

### Testing Strategy

- **Unit Tests (70%)**: Individual functions, components, and modules
- **Integration Tests (20%)**: API endpoints, database operations, authentication flows
- **Component Tests (10%)**: React components with user interactions

### Coverage Goals
- **Statements**: 70%+
- **Branches**: 70%+
- **Functions**: 70%+
- **Lines**: 70%+

## 🏗️ Project Structure

```
├── app/                          # Next.js App Router pages
│   ├── api/                     # API routes (auth, trpc)
│   ├── admin/                   # Admin dashboard pages
│   ├── leaderboards/            # Leaderboard pages
│   ├── players/                 # Player profile pages
│   ├── profile/                 # User profile management
│   ├── tournaments/             # Tournament pages
│   ├── layout.tsx               # Root layout with providers
│   └── page.tsx                 # Home page
├── components/                   # Reusable UI components
│   ├── ui/                      # shadcn/ui base components
│   ├── auth/                    # Authentication components
│   ├── dashboard/               # Dashboard components
│   ├── leaderboards/            # Leaderboard components
│   ├── player/                  # Player components
│   ├── tournaments/             # Tournament components
│   └── forms/                   # Form components
├── lib/                         # Shared utilities and configurations
│   ├── auth.ts                  # Better Auth configuration
│   ├── prisma.ts                # Prisma client
│   ├── trpc/                    # tRPC configuration and routers
│   ├── games/                   # Game system logic
│   ├── rating/                  # ELO rating system
│   ├── types/                   # TypeScript type definitions
│   └── utils/                   # Utility functions
├── hooks/                       # Custom React hooks
├── stores/                      # Zustand state stores
│   ├── auth-store.ts            # Authentication state
│   ├── tournament-store.ts      # Tournament state
│   ├── ui-store.ts              # UI state
│   ├── loading-store.ts         # Loading states
│   └── user-preferences-store.ts # User preferences
├── prisma/                      # Database schema and migrations
│   └── schema.prisma            # Prisma schema
├── __tests__/                   # Test files
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   ├── components/              # Component tests
│   └── utils/                   # Test utilities
└── scripts/                     # Utility scripts
    ├── verify-setup.js          # Setup verification
    └── create-missing-records.ts # Data migration scripts
```

## 🔌 API Documentation

### tRPC Routers

The application uses tRPC for type-safe API communication with the following routers:

#### Core Routers
- **`health`** - System health check
- **`auth`** - Authentication status and session management
- **`user`** - User profile management

#### Game & Player Routers
- **`games`** - Game management with format support
- **`players`** - Player profiles, statistics, and search
- **`decks`** - Deck management and archetypes

#### Tournament Routers
- **`tournaments`** - Tournament lifecycle management
- **`tournament-entries`** - Registration and entry management
- **`leaderboards`** - Rankings and leaderboard data
- **`uploads`** - File processing for tournament results

#### Utility Routers
- **`user-preferences`** - User preference management
- **`stores`** - Venue management

### Authentication Endpoints
- **`/api/auth/[...all]`** - Better Auth endpoints (OAuth, sessions)

## 🎮 Features

### ✅ Implemented Features

#### Authentication & User Management
- [x] **Multi-Provider OAuth**: Google, Discord, and Apple Sign-In
- [x] **User Profiles**: Comprehensive profile management with firstName/lastName
- [x] **Role-Based Access**: Player, organizer, and admin roles
- [x] **Session Management**: Secure session handling with Better Auth

#### Tournament System
- [x] **Tournament Lifecycle**: Complete management from creation to completion
- [x] **Registration System**: Player registration with deck selection
- [x] **Match Management**: Individual match results and scoring
- [x] **File Processing**: CSV/Excel tournament result processing
- [x] **Store Management**: Venue management for tournaments

#### Player & Game System
- [x] **Player Profiles**: Automatic player creation with external ID management
- [x] **Multi-Game Support**: Extensible game system with Pokemon TCG implementation
- [x] **Deck Management**: Deck tracking with archetype support
- [x] **ELO Rating System**: Game-specific ratings and seasonal statistics

#### Leaderboards & Rankings
- [x] **Real-Time Rankings**: Live leaderboard updates
- [x] **Seasonal Rankings**: Season-based leaderboard filtering
- [x] **Format Filtering**: Game format-specific rankings
- [x] **Performance Metrics**: Win rates, total games, and performance trends

#### User Experience
- [x] **Responsive Design**: Mobile-first design with Tailwind CSS
- [x] **Design System**: Comprehensive shadcn/ui component library
- [x] **State Management**: Efficient Zustand stores with persistence
- [x] **Privacy Controls**: Granular user preferences and profile visibility

### 🚧 In Development

- [ ] **Tournament Brackets**: Visual bracket display and management
- [ ] **Advanced Analytics**: Player performance analytics and insights
- [ ] **Mobile App**: Enhanced mobile experience and PWA features
- [ ] **Real-Time Updates**: WebSocket integration for live updates

## 🗄️ Database Schema

### Core Models

#### Authentication (Better Auth)
- **User**: User accounts with profile information
- **Account**: OAuth account connections
- **Session**: User sessions with expiry management
- **Verification**: Email verification tokens

#### Game System
- **Game**: Card game types with format support
- **Deck**: Deck archetypes with format-specific information
- **Player**: Player profiles linked to users
- **PlayerGameStats**: Game-specific statistics and ELO ratings

#### Tournament System
- **Store**: Tournament venues with contact information
- **Tournament**: Tournament information with comprehensive metadata
- **TournamentEntry**: Player registrations with deck selection
- **Match**: Individual match results with scoring

#### User Preferences
- **UserPreferences**: Privacy settings, communication preferences, display options

## 🔧 Development Scripts

### Core Commands
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
```

### Database Commands
```bash
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run db:migrate       # Create and run migrations
npm run db:studio        # Open Prisma Studio
```

### Testing Commands
```bash
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
npm run test:ci          # Run tests for CI/CD
```

### Utility Scripts
```bash
npm run script:create-missing-records        # Create missing database records
npm run script:create-missing-records:dry-run # Dry run for record creation
```

## 🚀 Deployment

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm run start
```

### Environment Variables for Production

Ensure all required environment variables are set in your production environment:

- `DATABASE_URL` - Production database connection
- `BETTER_AUTH_SECRET` - Secure authentication secret
- `BETTER_AUTH_URL` - Production application URL
- `NEXT_PUBLIC_APP_URL` - Public application URL
- OAuth provider credentials (if using social login)

### Database Migration

```bash
# Run production migrations
npm run db:migrate
```

## 🔐 OAuth Provider Setup

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" and create OAuth 2.0 Client IDs
5. Add authorized redirect URIs: `https://yourdomain.com/api/auth/callback/google`

### Discord OAuth Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to OAuth2 settings
4. Add redirect URI: `https://yourdomain.com/api/auth/callback/discord`
5. Copy Client ID and Client Secret

### Apple OAuth Setup

Detailed Apple OAuth setup instructions are available in [`docs/APPLE_OAUTH_SETUP.md`](docs/APPLE_OAUTH_SETUP.md).

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connection
npm run db:studio

# Reset database (development only)
npm run db:push --force-reset
```

#### Authentication Issues
- Verify OAuth provider credentials are correct
- Check that redirect URIs match your application URL
- Ensure `BETTER_AUTH_SECRET` is set and secure

#### Build Issues
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Verify ESLint configuration
npm run lint
```

**ESLint Configuration**: The project uses ESLint flat config (`eslint.config.mjs`) which requires Next.js 15+. If you encounter ESLint plugin warnings during build, ensure you're using the correct configuration format.

#### Test Issues
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- TournamentForm.test.tsx
```

### Getting Help

1. Check the [documentation](docs/) directory for detailed guides
2. Review the [testing strategy](docs/TESTING_STRATEGY.md) for testing issues
3. Check [schema management](docs/SCHEMA_MANAGEMENT.md) for database issues

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory:

- **[Testing Strategy](docs/TESTING_STRATEGY.md)** - Comprehensive testing approach
- **[Schema Management](docs/SCHEMA_MANAGEMENT.md)** - Database schema management
- **[Form System](docs/FORM_SYSTEM.md)** - Form handling and validation
- **[State Management](docs/state-stores/)** - Zustand store documentation
- **[Apple OAuth Setup](docs/APPLE_OAUTH_SETUP.md)** - Apple authentication setup

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style and patterns
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

## 📄 License

This project is licensed under the ISC License.

---

**Play Rough Rankings** - Building the future of tournament management, one game at a time.