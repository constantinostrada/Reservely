# Reservely - Project Structure

Complete overview of the project structure and organization.

## Root Structure

```
reservely/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
├── prisma/                       # Database schema and migrations
│   └── schema.prisma             # Prisma schema definition
├── src/                          # Source code (Clean Architecture)
│   ├── domain/                   # Domain layer
│   ├── application/              # Application layer
│   ├── infrastructure/           # Infrastructure layer
│   └── interfaces/               # Interfaces layer
├── .github/                      # GitHub configuration (if needed)
├── node_modules/                 # Dependencies (git-ignored)
├── .next/                        # Next.js build output (git-ignored)
├── CLAUDE.md                     # Architecture contract
├── architecture.json             # Machine-readable layer rules
├── README.md                     # Project documentation
├── SETUP.md                      # Setup instructions
├── API.md                        # API documentation
├── CONTRIBUTING.md               # Contribution guidelines
├── DEPLOYMENT.md                 # Deployment guide
├── PROJECT_STRUCTURE.md          # This file
├── package.json                  # NPM dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── next.config.js                # Next.js configuration
├── .eslintrc.json                # ESLint configuration
├── .prettierrc                   # Prettier configuration
├── .gitignore                    # Git ignore rules
├── .env.example                  # Environment variables template
├── docker-compose.yml            # Docker Compose configuration
├── Dockerfile                    # Docker build instructions
├── jest.config.js                # Jest test configuration
└── LICENSE                       # MIT License
```

## Domain Layer (`src/domain/`)

Pure business logic with zero external dependencies.

```
src/domain/
├── CLAUDE.md                     # Domain layer rules
├── entities/
│   ├── Reservation.ts            # Reservation entity with business rules
│   └── Table.ts                  # Table entity with business rules
├── value-objects/
│   ├── Email.ts                  # Email value object (immutable)
│   ├── ReservationStatus.ts     # Reservation status enum
│   └── TableStatus.ts            # Table status enum
├── repositories/
│   ├── IReservationRepository.ts # Reservation repository interface
│   └── ITableRepository.ts       # Table repository interface
├── services/
│   └── ReservationDomainService.ts # Domain service for complex logic
├── exceptions/
│   └── DomainException.ts        # Domain-specific exceptions
└── __tests__/
    └── Email.test.ts             # Domain unit tests
```

### Key Domain Concepts

- **Entities**: Objects with identity and lifecycle (Reservation, Table)
- **Value Objects**: Immutable objects defined by their values (Email, Status)
- **Repository Interfaces**: Abstractions for data access
- **Domain Services**: Complex business logic that doesn't fit in entities
- **Exceptions**: Domain-specific error types

## Application Layer (`src/application/`)

Use cases and application logic that orchestrates domain objects.

```
src/application/
├── CLAUDE.md                     # Application layer rules
├── use-cases/
│   ├── CreateReservationUseCase.ts
│   ├── GetReservationUseCase.ts
│   ├── ListReservationsUseCase.ts
│   ├── ConfirmReservationUseCase.ts
│   ├── CancelReservationUseCase.ts
│   ├── CreateTableUseCase.ts
│   └── ListTablesUseCase.ts
├── dtos/
│   ├── ReservationDTO.ts         # Data transfer objects for reservations
│   └── TableDTO.ts               # Data transfer objects for tables
├── mappers/
│   ├── ReservationMapper.ts      # Maps between domain and DTOs
│   └── TableMapper.ts            # Maps between domain and DTOs
└── __tests__/
    └── CreateReservationUseCase.test.ts
```

### Use Case Pattern

Each use case:
1. Has a single `execute(dto)` method
2. Receives dependencies via constructor (DI)
3. Orchestrates domain logic
4. Returns DTOs (never domain entities)
5. Is independently testable

## Infrastructure Layer (`src/infrastructure/`)

Implementations of interfaces and external I/O operations.

```
src/infrastructure/
├── CLAUDE.md                     # Infrastructure layer rules
├── database/
│   └── prisma.ts                 # Prisma client singleton
├── repositories/
│   ├── PrismaReservationRepository.ts # Implements IReservationRepository
│   └── PrismaTableRepository.ts       # Implements ITableRepository
└── di/
    └── container.ts              # Dependency injection container
```

### Repository Implementation Pattern

Each repository:
1. Implements a domain interface
2. Uses Prisma for database access
3. Maps between Prisma models and domain entities
4. Handles database errors
5. Never exposes Prisma types to other layers

## Interfaces Layer (`src/interfaces/`)

Entry points and adapters for external communication.

```
src/interfaces/
├── CLAUDE.md                     # Interfaces layer rules
├── http/
│   ├── controllers/
│   │   ├── ReservationController.ts
│   │   └── TableController.ts
│   ├── validation/
│   │   ├── reservationSchemas.ts
│   │   └── tableSchemas.ts
│   └── utils/
│       └── errorHandler.ts
```

### Controller Pattern

Controllers are thin adapters that:
1. Validate input (schema validation)
2. Call use cases
3. Transform responses
4. Handle errors appropriately
5. Return HTTP responses

## API Routes (`app/api/`)

Next.js API routes that use controllers.

```
app/api/
├── reservations/
│   ├── route.ts                  # GET, POST /api/reservations
│   └── [id]/
│       ├── route.ts              # GET /api/reservations/:id
│       ├── confirm/
│       │   └── route.ts          # POST /api/reservations/:id/confirm
│       └── cancel/
│           └── route.ts          # POST /api/reservations/:id/cancel
├── tables/
│   └── route.ts                  # GET, POST /api/tables
└── health/
    └── route.ts                  # GET /api/health
```

## Database Schema (`prisma/`)

```
prisma/
├── schema.prisma                 # Database schema definition
└── migrations/                   # Migration files (generated)
```

### Current Models

- **Reservation**: Guest reservations with status tracking
- **Table**: Restaurant tables with capacity and availability

## Configuration Files

### TypeScript (`tsconfig.json`)
- Strict type checking enabled
- Path aliases configured for clean imports:
  - `@/` → project root
  - `@domain/` → domain layer
  - `@application/` → application layer
  - `@infrastructure/` → infrastructure layer
  - `@interfaces/` → interfaces layer

### ESLint (`.eslintrc.json`)
- Next.js recommended rules
- TypeScript support
- No `any` types allowed
- Unused variables flagged

### Prettier (`.prettierrc`)
- 2 space indentation
- Single quotes
- 80 character line width
- Trailing commas (ES5)

## Dependency Flow

```
┌─────────────────────────────────────────┐
│          Interfaces Layer               │
│  (Controllers, API Routes, Validation)  │
└─────────────┬───────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│         Application Layer               │
│     (Use Cases, DTOs, Mappers)          │
└─────────────┬───────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│           Domain Layer                  │
│  (Entities, Value Objects, Interfaces)  │
└─────────────────────────────────────────┘
              ↑
              │
┌─────────────┴───────────────────────────┐
│       Infrastructure Layer              │
│  (Repositories, DB, External APIs)      │
└─────────────────────────────────────────┘
```

## Key Principles

### 1. Dependency Rule
- Dependencies only point inward
- Domain has zero dependencies
- Application depends only on domain
- Infrastructure implements domain/application interfaces
- Interfaces orchestrates but doesn't contain logic

### 2. Single Responsibility
- Each class has one reason to change
- Entities: business rules
- Use cases: application logic
- Repositories: data access
- Controllers: HTTP handling

### 3. Interface Segregation
- Small, focused interfaces
- Clients don't depend on unused methods
- Easy to mock for testing

### 4. Dependency Inversion
- High-level modules don't depend on low-level modules
- Both depend on abstractions
- Use dependency injection

## Testing Strategy

```
src/
├── domain/__tests__/             # Unit tests for domain logic
│   └── Email.test.ts
├── application/__tests__/        # Unit tests for use cases
│   └── CreateReservationUseCase.test.ts
└── interfaces/__tests__/         # Integration tests for controllers
```

### Test Types

1. **Unit Tests**: Domain entities, value objects, services
2. **Use Case Tests**: Application logic with mocked repositories
3. **Integration Tests**: API endpoints with test database
4. **E2E Tests**: Full user workflows

## Development Workflow

1. **Feature Planning**: Identify which layer(s) affected
2. **Domain First**: Create/modify entities and rules
3. **Application Layer**: Create/modify use cases
4. **Infrastructure**: Implement required repositories
5. **Interfaces**: Create controllers and routes
6. **Testing**: Write tests at each layer
7. **Documentation**: Update relevant docs

## Code Organization Best Practices

### Naming Conventions

- **Entities**: PascalCase, singular (e.g., `Reservation`)
- **Use Cases**: PascalCase with "UseCase" suffix (e.g., `CreateReservationUseCase`)
- **Interfaces**: PascalCase with "I" prefix (e.g., `IReservationRepository`)
- **DTOs**: PascalCase with "DTO" suffix (e.g., `ReservationDTO`)
- **Value Objects**: PascalCase (e.g., `Email`, `ReservationStatus`)

### File Organization

- One class per file
- File name matches class name
- Related files grouped in directories
- Tests colocated with source in `__tests__` directories

### Import Order

1. External dependencies (node_modules)
2. Absolute imports (@domain, @application, etc.)
3. Relative imports (., ..)
4. Type imports

Example:
```typescript
import { PrismaClient } from '@prisma/client';
import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { Reservation } from '@domain/entities/Reservation';
import { Email } from '@domain/value-objects/Email';
import type { ReservationProps } from './types';
```

## Adding New Features

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines on adding new features while maintaining clean architecture.

## Questions?

- Architecture questions: See [CLAUDE.md](./CLAUDE.md)
- Setup issues: See [SETUP.md](./SETUP.md)
- API documentation: See [API.md](./API.md)
- Deployment: See [DEPLOYMENT.md](./DEPLOYMENT.md)
