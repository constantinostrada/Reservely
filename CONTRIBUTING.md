# Contributing to Reservely

Thank you for your interest in contributing to Reservely! This document provides guidelines and instructions for contributing.

## Architecture Principles

This project strictly follows **Clean Architecture** principles. Before contributing, please:

1. Read `CLAUDE.md` - the global architecture contract
2. Review `architecture.json` - machine-readable layer rules
3. Read the layer-specific `CLAUDE.md` files in each `src/` subdirectory

## Layer Rules

### Dependency Flow
```
interfaces → application → domain
infrastructure → application → domain
```

### What Lives Where

- **Domain** (`src/domain/`): Entities, value objects, repository interfaces, domain services
  - Zero external dependencies
  - Pure TypeScript, no framework imports
  
- **Application** (`src/application/`): Use cases, DTOs, application services
  - Depends only on domain
  - One use case per file with `execute(dto)` method
  
- **Infrastructure** (`src/infrastructure/`): Database, external APIs, repository implementations
  - Implements interfaces from domain/application
  - Contains all I/O operations
  
- **Interfaces** (`src/interfaces/`): API routes, controllers, input validation
  - Thin layer - validation and orchestration only
  - No business logic

## Development Workflow

1. **Fork and Clone**
```bash
git clone <your-fork-url>
cd reservely
```

2. **Install Dependencies**
```bash
npm install
```

3. **Set Up Database**
```bash
cp .env.example .env
# Edit .env with your database credentials
npm run prisma:migrate
```

4. **Create a Branch**
```bash
git checkout -b feature/your-feature-name
```

5. **Make Changes**
- Follow the layer rules strictly
- Write tests for use cases
- Update documentation if needed

6. **Code Quality**
```bash
npm run lint
npm run type-check
npm run format
```

7. **Commit**
```bash
git add .
git commit -m "feat: your feature description"
```

Follow conventional commits:
- `feat:` - new feature
- `fix:` - bug fix
- `docs:` - documentation changes
- `refactor:` - code refactoring
- `test:` - adding tests
- `chore:` - maintenance

8. **Push and Create PR**
```bash
git push origin feature/your-feature-name
```

## Adding a New Feature

### Example: Adding a new entity

1. **Start in Domain**
```typescript
// src/domain/entities/YourEntity.ts
export class YourEntity {
  constructor(private props: YourEntityProps) {
    this.validate();
  }
  // Business logic here
}
```

2. **Create Repository Interface**
```typescript
// src/domain/repositories/IYourEntityRepository.ts
export interface IYourEntityRepository {
  save(entity: YourEntity): Promise<YourEntity>;
  findById(id: string): Promise<YourEntity | null>;
}
```

3. **Create Use Case**
```typescript
// src/application/use-cases/CreateYourEntityUseCase.ts
export class CreateYourEntityUseCase {
  constructor(private repo: IYourEntityRepository) {}
  
  async execute(dto: CreateYourEntityDTO): Promise<YourEntityDTO> {
    // Orchestrate domain logic
  }
}
```

4. **Implement Repository**
```typescript
// src/infrastructure/repositories/PrismaYourEntityRepository.ts
export class PrismaYourEntityRepository implements IYourEntityRepository {
  // Prisma implementation
}
```

5. **Create Controller and Route**
```typescript
// src/interfaces/http/controllers/YourEntityController.ts
// app/api/your-entity/route.ts
```

## Code Review Checklist

Before submitting a PR, ensure:

- [ ] No layer dependency violations
- [ ] All TypeScript errors resolved
- [ ] ESLint passes with no errors
- [ ] Code is formatted with Prettier
- [ ] Tests added for use cases
- [ ] Documentation updated
- [ ] No `any` types used
- [ ] No business logic in controllers
- [ ] Domain layer has zero external imports
- [ ] Error handling is proper

## Testing

```bash
npm run test
npm run test:coverage
```

Write tests for:
- Domain entities and value objects
- Use cases (mock repositories)
- Domain services

## Questions?

If you're unsure about where a piece of code should go, please ask in an issue before submitting a PR.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
