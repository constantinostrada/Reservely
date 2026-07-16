# Reservely - Clean Architecture Summary

A concise reference guide to the clean architecture implementation in Reservely.

## Core Principles

### 1. The Dependency Rule

**Dependencies point INWARD only:**

```
┌─────────────────────────────────────┐
│         INTERFACES LAYER            │  ← Controllers, API Routes
│  (HTTP, CLI, GraphQL, WebSockets)  │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│       APPLICATION LAYER             │  ← Use Cases, DTOs
│    (Business Workflow Logic)        │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│         DOMAIN LAYER                │  ← Entities, Rules
│     (Pure Business Logic)           │  ← NO external deps
└─────────────────────────────────────┘
             ↑
             │ implements interfaces
┌────────────┴────────────────────────┐
│      INFRASTRUCTURE LAYER           │  ← Prisma, APIs, DB
│   (External Concerns, I/O)          │
└─────────────────────────────────────┘
```

### 2. Layer Responsibilities

| Layer | Purpose | Can Import | Cannot Import |
|-------|---------|-----------|---------------|
| **Domain** | Business entities and rules | Only domain | Everything else |
| **Application** | Use cases and workflows | Domain, Application | Infrastructure, Interfaces |
| **Infrastructure** | External I/O (DB, APIs) | Domain, Application, Infrastructure | Interfaces |
| **Interfaces** | Entry points (HTTP, CLI) | Application, Interfaces | Domain, Infrastructure |

### 3. The Golden Rules

1. **Domain is pure** - Zero external dependencies
2. **Application orchestrates** - No implementation details
3. **Infrastructure implements** - Fulfills interfaces from domain/application
4. **Interfaces adapt** - Thin layer, no business logic

## Layer Details

### Domain Layer (`src/domain/`)

**What Lives Here:**
- ✅ Entities (e.g., `Reservation`, `Table`)
- ✅ Value Objects (e.g., `Email`, `ReservationStatus`)
- ✅ Repository Interfaces (e.g., `IReservationRepository`)
- ✅ Domain Services (e.g., `ReservationDomainService`)
- ✅ Domain Exceptions
- ✅ Business validation rules

**Forbidden:**
- ❌ Database/ORM code
- ❌ HTTP types (Request, Response)
- ❌ Third-party libraries
- ❌ `process.env`
- ❌ File I/O
- ❌ External API calls

**Example:**
```typescript
// ✅ GOOD: Pure domain entity
export class Reservation {
  constructor(private props: ReservationProps) {
    this.validateBusinessRules();
  }
  
  public confirm(): void {
    if (this.status.isCancelled()) {
      throw new Error('Cannot confirm cancelled reservation');
    }
    this.props.status = ReservationStatus.confirmed();
  }
}

// ❌ BAD: Infrastructure leak
export class Reservation {
  @PrismaDecorator() // NO! ORM in domain
  public id: string;
}
```

### Application Layer (`src/application/`)

**What Lives Here:**
- ✅ Use Cases (one per business operation)
- ✅ DTOs (Data Transfer Objects)
- ✅ Mappers (Domain ↔ DTO)
- ✅ Port Interfaces (for infrastructure needs)

**Use Case Pattern:**
```typescript
export class CreateReservationUseCase {
  constructor(
    private reservationRepo: IReservationRepository,
    private tableRepo: ITableRepository,
    private domainService: ReservationDomainService
  ) {}

  async execute(dto: CreateReservationDTO): Promise<ReservationDTO> {
    // 1. Map to domain
    const reservation = ReservationMapper.toDomain(dto);
    
    // 2. Validate with domain service
    const isValid = this.domainService.validate(reservation);
    
    // 3. Persist via repository interface
    const saved = await this.reservationRepo.save(reservation);
    
    // 4. Return DTO
    return ReservationMapper.toDTO(saved);
  }
}
```

**Key Points:**
- Each use case = one file
- Use cases receive dependencies via constructor
- Return DTOs, never domain entities
- No direct database or API calls

### Infrastructure Layer (`src/infrastructure/`)

**What Lives Here:**
- ✅ Repository implementations (Prisma)
- ✅ Database client configuration
- ✅ External API clients
- ✅ File system operations
- ✅ Message queue clients
- ✅ Email service adapters

**Repository Pattern:**
```typescript
export class PrismaReservationRepository implements IReservationRepository {
  constructor(private prisma: PrismaClient) {}

  async save(reservation: Reservation): Promise<Reservation> {
    // Map domain → Prisma model
    const data = this.toPrismaModel(reservation);
    
    // Persist
    const created = await this.prisma.reservation.create({ data });
    
    // Map Prisma model → domain
    return this.toDomain(created);
  }

  private toDomain(prismaModel: any): Reservation {
    return new Reservation({
      id: prismaModel.id,
      guestName: prismaModel.guestName,
      guestEmail: new Email(prismaModel.guestEmail),
      // ... map all fields
    });
  }
}
```

**Key Points:**
- Implements interfaces from domain/application
- Maps between persistence and domain models
- Never expose ORM types outside this layer
- Handle all I/O errors here

### Interfaces Layer (`src/interfaces/`)

**What Lives Here:**
- ✅ HTTP Controllers
- ✅ API Route Handlers
- ✅ Input validation schemas
- ✅ Request/Response formatting
- ✅ Error handling middleware

**Controller Pattern:**
```typescript
export class ReservationController {
  async create(dto: CreateReservationDTO) {
    const useCase = container.getCreateReservationUseCase();
    return await useCase.execute(dto);
  }
}

// API Route
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createReservationSchema.parse(body);
    const controller = new ReservationController();
    const result = await controller.create(validated);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
```

**Key Points:**
- Thin adapters only
- Validate input (format, not business rules)
- Call use cases
- Format responses
- No business logic

## Common Patterns

### 1. Creating a New Feature

```
1. Domain: Define entity/value object
   └─> src/domain/entities/YourEntity.ts

2. Domain: Define repository interface
   └─> src/domain/repositories/IYourEntityRepository.ts

3. Application: Create DTOs
   └─> src/application/dtos/YourEntityDTO.ts

4. Application: Create use case
   └─> src/application/use-cases/CreateYourEntityUseCase.ts

5. Infrastructure: Implement repository
   └─> src/infrastructure/repositories/PrismaYourEntityRepository.ts

6. Interfaces: Create controller
   └─> src/interfaces/http/controllers/YourEntityController.ts

7. Interfaces: Create API route
   └─> app/api/your-entity/route.ts
```

### 2. Dependency Injection

```typescript
// Infrastructure: Container
class Container {
  getCreateReservationUseCase(): CreateReservationUseCase {
    return new CreateReservationUseCase(
      this.getReservationRepository(),
      this.getTableRepository(),
      this.getReservationDomainService()
    );
  }
}

// Interfaces: Controller uses container
export class ReservationController {
  async create(dto: CreateReservationDTO) {
    const useCase = container.getCreateReservationUseCase();
    return await useCase.execute(dto);
  }
}
```

### 3. Error Handling

```typescript
// Domain: Business exceptions
export class DomainException extends Error {}
export class EntityNotFoundException extends DomainException {}

// Application: Use case throws domain exceptions
async execute(dto: DTO): Promise<ResultDTO> {
  const entity = await this.repo.findById(dto.id);
  if (!entity) {
    throw new EntityNotFoundException('Reservation', dto.id);
  }
  return mapper.toDTO(entity);
}

// Interfaces: Map to HTTP responses
export function handleError(error: unknown): NextResponse {
  if (error instanceof EntityNotFoundException) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  // ... handle other error types
}
```

## Testing Strategy

### Domain Layer Tests
```typescript
// Unit tests - no mocks needed
describe('Reservation', () => {
  it('should confirm pending reservation', () => {
    const reservation = new Reservation({...});
    reservation.confirm();
    expect(reservation.status.isConfirmed()).toBe(true);
  });
});
```

### Application Layer Tests
```typescript
// Use case tests - mock repositories
describe('CreateReservationUseCase', () => {
  it('should create reservation', async () => {
    const mockRepo = { save: jest.fn() };
    const useCase = new CreateReservationUseCase(mockRepo, ...);
    await useCase.execute(dto);
    expect(mockRepo.save).toHaveBeenCalled();
  });
});
```

### Interfaces Layer Tests
```typescript
// Integration tests - test full flow
describe('POST /api/reservations', () => {
  it('should create reservation via API', async () => {
    const response = await POST(request);
    expect(response.status).toBe(201);
  });
});
```

## File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Entity | PascalCase | `Reservation.ts` |
| Value Object | PascalCase | `Email.ts` |
| Repository Interface | `I` + PascalCase + `Repository` | `IReservationRepository.ts` |
| Repository Impl | `Prisma` + PascalCase + `Repository` | `PrismaReservationRepository.ts` |
| Use Case | PascalCase + `UseCase` | `CreateReservationUseCase.ts` |
| DTO | PascalCase + `DTO` | `ReservationDTO.ts` |
| Controller | PascalCase + `Controller` | `ReservationController.ts` |

## Import Rules

### ✅ Allowed

```typescript
// Domain can import domain
import { Reservation } from '@domain/entities/Reservation';

// Application can import domain
import { IReservationRepository } from '@domain/repositories/IReservationRepository';

// Infrastructure can import domain and application
import { Reservation } from '@domain/entities/Reservation';
import { CreateReservationDTO } from '@application/dtos/ReservationDTO';

// Interfaces can import application (but NOT domain or infrastructure)
import { CreateReservationUseCase } from '@application/use-cases/CreateReservationUseCase';
```

### ❌ Forbidden

```typescript
// Domain CANNOT import anything external
import { PrismaClient } from '@prisma/client'; // ❌

// Application CANNOT import infrastructure
import { PrismaReservationRepository } from '@infrastructure/repositories/...'; // ❌

// Interfaces CANNOT import domain directly
import { Reservation } from '@domain/entities/Reservation'; // ❌

// Interfaces CANNOT import infrastructure
import { prisma } from '@infrastructure/database/prisma'; // ❌
```

## Quick Reference

### When creating a new file, ask:

1. **Does it contain business rules?** → Domain
2. **Does it orchestrate a workflow?** → Application (Use Case)
3. **Does it touch external systems?** → Infrastructure
4. **Does it handle HTTP/input?** → Interfaces

### Red Flags 🚩

- Business logic in controllers → Move to domain
- Database queries in use cases → Move to repository
- HTTP types in domain → Remove immediately
- Use case calling another use case → Extract shared logic to domain service
- Controller with complex logic → Extract to use case

## Benefits

✅ **Testability**: Easy to test in isolation
✅ **Flexibility**: Swap out frameworks/databases
✅ **Maintainability**: Clear boundaries
✅ **Scalability**: Independent deployment of layers
✅ **Team collaboration**: Clear ownership

## Anti-Patterns to Avoid

❌ **God Classes**: Keep entities focused
❌ **Anemic Domain**: Put logic in entities, not services
❌ **Fat Controllers**: Move logic to use cases
❌ **Leaky Abstractions**: Don't expose implementation details
❌ **Circular Dependencies**: Follow the dependency rule strictly

## Resources

- [Full Documentation](./README.md)
- [Architecture Contract](./CLAUDE.md)
- [Setup Guide](./SETUP.md)
- [API Documentation](./API.md)
- [Code Examples](./EXAMPLES.md)

---

**Remember**: When in doubt, follow the dependency rule. Dependencies flow inward, always.
