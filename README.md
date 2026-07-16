# Reservely

A modern reservation management system built with clean architecture principles, TypeScript, Next.js, PostgreSQL, and Prisma.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Validation**: Zod
- **Code Quality**: ESLint, Prettier

## Architecture

This project follows **Clean Architecture** principles with strict layer separation:

### Layer Structure

```
src/
├── domain/         → Business entities, value objects, domain services, repository interfaces
├── application/    → Use cases, DTOs, application services
├── infrastructure/ → Database clients, external API adapters, repository implementations
└── interfaces/     → Controllers, route handlers, API endpoints
```

### Dependency Rule

Dependencies flow **inward only**:

```
interfaces → application → domain
infrastructure → application → domain
```

- **Domain layer** has zero external dependencies
- **Application layer** depends only on domain
- **Infrastructure layer** implements interfaces defined in domain/application
- **Interfaces layer** orchestrates use cases, contains no business logic

### What Lives Where

#### Domain Layer (`src/domain/`)
- Entities with business rules
- Value objects (immutable)
- Domain services
- Repository interfaces (abstractions only)
- Domain events and exceptions

#### Application Layer (`src/application/`)
- Use cases (one per business operation)
- DTOs (data transfer objects)
- Application services
- Port interfaces for infrastructure

#### Infrastructure Layer (`src/infrastructure/`)
- Prisma repository implementations
- Database client configuration
- External API clients
- ORM models and migrations

#### Interfaces Layer (`src/interfaces/`)
- Next.js API routes
- HTTP controllers
- Request/response handlers
- Input validation schemas

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm 9+

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd reservely
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your database credentials.

4. Set up the database:
```bash
npm run prisma:migrate
npm run prisma:generate
npm run prisma:seed
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:seed` - Seed the database with sample data
- `npm run prisma:studio` - Open Prisma Studio

## Data Model

The Prisma schema (`prisma/schema.prisma`) defines the full Reservely domain:
`Restaurant`, `User`, `Table`, `MenuItem`, `Reservation`, `Order`, `OrderItem`,
and `Payment`.

### Modeling Conventions

- **Money as integer cents.** Every monetary field (`price_cents`,
  `unit_price_cents`, `subtotal_cents`, `tax_cents`, `tip_cents`,
  `total_cents`, `amount_cents`) is an `Int` holding cents of the
  restaurant's currency. Floats are never used for money — integer math
  avoids rounding drift; format to a display amount only at the edge.
  Each restaurant carries an ISO 4217 `currency` code (e.g. `USD`, `EUR`).
- **Tenant scoping.** `Restaurant` is the tenant root. Every tenant-owned
  row carries a `restaurant_id` foreign key — including line-item tables
  like `order_items`, so tenant filters never require a join. Uniqueness
  is scoped per tenant (e.g. a table `number` or menu item `name` is unique
  *within* a restaurant, not globally), and indexes are prefixed with
  `restaurant_id` to keep tenant-scoped queries fast.
- **Naming.** Database tables and columns are `snake_case` (mapped via
  `@@map`/`@map`), while the Prisma client API stays `camelCase`.
  Table names are plural (`restaurants`, `order_items`); enums are
  `SCREAMING_SNAKE` values in `snake_case` types.
- **Ids.** All primary keys are `cuid()` strings — collision-safe,
  sortable-ish, and generatable client-side (no sequence round-trip).
- **Price snapshots.** `order_items.unit_price_cents` copies the menu
  item's price at order time, so later menu edits never rewrite past
  orders; `menu_items` are `Restrict`-protected from deletion while
  referenced. Order totals are stored denormalized on `orders`.
- **Deletion behavior.** Deleting a restaurant cascades to everything it
  owns. Deleting a table or reservation leaves orders/reservations in
  place (`SetNull`); payments and order items die with their order.

### Seed Data

`prisma/seed.ts` (run via `npm run prisma:seed`) creates two restaurants —
*Trattoria Bella* (EUR) and *Harbor Diner* (USD) — each with users, tables,
and a small menu. The seed is idempotent: it wipes and recreates the data.

## Project Structure

```
reservely/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── domain/
│   │   ├── entities/          # Business entities
│   │   ├── value-objects/     # Immutable value objects
│   │   ├── repositories/      # Repository interfaces
│   │   ├── services/          # Domain services
│   │   └── exceptions/        # Domain exceptions
│   ├── application/
│   │   ├── use-cases/         # Application use cases
│   │   ├── dtos/              # Data transfer objects
│   │   └── ports/             # Infrastructure port interfaces
│   ├── infrastructure/
│   │   ├── database/          # Database configuration
│   │   ├── repositories/      # Repository implementations
│   │   └── prisma/            # Prisma client
│   └── interfaces/
│       ├── http/              # HTTP controllers
│       └── api/               # Next.js API routes
├── app/                       # Next.js App Router
├── architecture.json          # Architecture rules (machine-readable)
├── CLAUDE.md                  # Architecture documentation
└── package.json
```

## Development Guidelines

### Adding a New Feature

1. **Start in Domain**: Define entities, value objects, and repository interfaces
2. **Application Layer**: Create a use case with `execute(dto)` method
3. **Infrastructure**: Implement repository interface with Prisma
4. **Interfaces**: Create API route that calls the use case

### Code Quality

- All code must pass TypeScript strict mode
- No `any` types allowed
- Follow layer dependency rules strictly
- Write tests for use cases
- Use Prettier for formatting

## Example: Creating a Reservation

```typescript
// 1. Domain entity (src/domain/entities/Reservation.ts)
class Reservation {
  constructor(private props: ReservationProps) {
    this.validate();
  }
}

// 2. Use case (src/application/use-cases/CreateReservationUseCase.ts)
class CreateReservationUseCase {
  async execute(dto: CreateReservationDTO): Promise<ReservationDTO> {
    // Orchestrate domain logic
  }
}

// 3. API route (app/api/reservations/route.ts)
export async function POST(request: Request) {
  const useCase = container.resolve(CreateReservationUseCase);
  return useCase.execute(data);
}
```

## Contributing

1. Follow clean architecture principles
2. Maintain layer boundaries
3. Write tests for use cases
4. Update documentation

## License

MIT
