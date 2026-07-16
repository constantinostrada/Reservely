# Reservely - Usage Examples

Practical examples of how to use the Reservely API and extend the codebase.

## Table of Contents

- [API Usage Examples](#api-usage-examples)
- [Code Examples](#code-examples)
- [Common Scenarios](#common-scenarios)
- [Testing Examples](#testing-examples)

## API Usage Examples

### Create a Table

```bash
curl -X POST http://localhost:3000/api/tables \
  -H "Content-Type: application/json" \
  -d '{
    "tableNumber": 1,
    "capacity": 4,
    "location": "Window"
  }'
```

Response:
```json
{
  "id": "clq1234567890",
  "tableNumber": 1,
  "capacity": 4,
  "location": "Window",
  "status": "available",
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-10T10:00:00.000Z"
}
```

### Create Multiple Tables

```bash
# Table 1 - Window seat
curl -X POST http://localhost:3000/api/tables \
  -H "Content-Type: application/json" \
  -d '{"tableNumber": 1, "capacity": 2, "location": "Window"}'

# Table 2 - Main dining area
curl -X POST http://localhost:3000/api/tables \
  -H "Content-Type: application/json" \
  -d '{"tableNumber": 2, "capacity": 4, "location": "Main"}'

# Table 3 - Private room
curl -X POST http://localhost:3000/api/tables \
  -H "Content-Type: application/json" \
  -d '{"tableNumber": 3, "capacity": 8, "location": "Private"}'
```

### List All Tables

```bash
curl http://localhost:3000/api/tables
```

### Create a Reservation

```bash
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "guestName": "Alice Johnson",
    "guestEmail": "alice@example.com",
    "guestPhone": "+1234567890",
    "date": "2024-12-25T00:00:00.000Z",
    "time": "19:00",
    "partySize": 4,
    "notes": "Anniversary dinner, window seat preferred"
  }'
```

Response:
```json
{
  "id": "clq9876543210",
  "guestName": "Alice Johnson",
  "guestEmail": "alice@example.com",
  "guestPhone": "+1234567890",
  "date": "2024-12-25T00:00:00.000Z",
  "time": "19:00",
  "partySize": 4,
  "status": "pending",
  "notes": "Anniversary dinner, window seat preferred",
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-10T10:00:00.000Z"
}
```

### List All Reservations

```bash
curl http://localhost:3000/api/reservations
```

### Get Specific Reservation

```bash
curl http://localhost:3000/api/reservations/clq9876543210
```

### Confirm a Reservation

```bash
curl -X POST http://localhost:3000/api/reservations/clq9876543210/confirm
```

Response:
```json
{
  "id": "clq9876543210",
  "guestName": "Alice Johnson",
  "guestEmail": "alice@example.com",
  "guestPhone": "+1234567890",
  "date": "2024-12-25T00:00:00.000Z",
  "time": "19:00",
  "partySize": 4,
  "status": "confirmed",
  "notes": "Anniversary dinner, window seat preferred",
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-10T11:00:00.000Z"
}
```

### Cancel a Reservation

```bash
curl -X POST http://localhost:3000/api/reservations/clq9876543210/cancel
```

### Check API Health

```bash
curl http://localhost:3000/api/health
```

## Code Examples

### Creating a New Entity

Example: Adding a `Menu` entity

```typescript
// src/domain/entities/Menu.ts
export interface MenuProps {
  id?: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  available: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Menu {
  private readonly props: MenuProps;

  constructor(props: MenuProps) {
    this.validateProps(props);
    this.props = {
      ...props,
      id: props.id || this.generateId(),
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  private validateProps(props: MenuProps): void {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Menu name is required');
    }

    if (props.price < 0) {
      throw new Error('Price cannot be negative');
    }

    if (!props.category) {
      throw new Error('Category is required');
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Getters
  get id(): string { return this.props.id!; }
  get name(): string { return this.props.name; }
  get price(): number { return this.props.price; }
  get available(): boolean { return this.props.available; }

  // Business methods
  public makeUnavailable(): void {
    this.props.available = false;
    this.props.updatedAt = new Date();
  }

  public makeAvailable(): void {
    this.props.available = true;
    this.props.updatedAt = new Date();
  }

  public updatePrice(newPrice: number): void {
    if (newPrice < 0) {
      throw new Error('Price cannot be negative');
    }
    this.props.price = newPrice;
    this.props.updatedAt = new Date();
  }
}
```

### Creating a Use Case

Example: `CreateMenuUseCase`

```typescript
// src/application/use-cases/CreateMenuUseCase.ts
import { IMenuRepository } from '@domain/repositories/IMenuRepository';
import { CreateMenuDTO, MenuDTO } from '../dtos/MenuDTO';
import { MenuMapper } from '../mappers/MenuMapper';

export class CreateMenuUseCase {
  constructor(private readonly menuRepository: IMenuRepository) {}

  async execute(dto: CreateMenuDTO): Promise<MenuDTO> {
    // Validate business rules
    if (dto.price < 0) {
      throw new Error('Price cannot be negative');
    }

    // Map DTO to domain entity
    const menu = MenuMapper.toDomain(dto);

    // Save the menu
    const savedMenu = await this.menuRepository.save(menu);

    // Return DTO
    return MenuMapper.toDTO(savedMenu);
  }
}
```

### Creating a Repository Implementation

Example: `PrismaMenuRepository`

```typescript
// src/infrastructure/repositories/PrismaMenuRepository.ts
import { PrismaClient } from '@prisma/client';
import { IMenuRepository } from '@domain/repositories/IMenuRepository';
import { Menu } from '@domain/entities/Menu';

export class PrismaMenuRepository implements IMenuRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(menu: Menu): Promise<Menu> {
    const data = {
      id: menu.id,
      name: menu.name,
      description: menu.description || null,
      price: menu.price,
      category: menu.category,
      available: menu.available,
      createdAt: menu.createdAt,
      updatedAt: menu.updatedAt,
    };

    const created = await this.prisma.menu.create({ data });
    return this.toDomain(created);
  }

  async findById(id: string): Promise<Menu | null> {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    return menu ? this.toDomain(menu) : null;
  }

  async findAll(): Promise<Menu[]> {
    const menus = await this.prisma.menu.findMany({
      orderBy: { category: 'asc' },
    });
    return menus.map((m) => this.toDomain(m));
  }

  private toDomain(data: any): Menu {
    return new Menu({
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      price: data.price,
      category: data.category,
      available: data.available,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
```

### Creating a Controller

Example: `MenuController`

```typescript
// src/interfaces/http/controllers/MenuController.ts
import { container } from '@infrastructure/di/container';
import { CreateMenuDTO } from '@application/dtos/MenuDTO';

export class MenuController {
  async create(dto: CreateMenuDTO) {
    const useCase = container.getCreateMenuUseCase();
    return await useCase.execute(dto);
  }

  async list() {
    const useCase = container.getListMenusUseCase();
    return await useCase.execute();
  }

  async getById(id: string) {
    const useCase = container.getGetMenuUseCase();
    return await useCase.execute(id);
  }
}
```

### Creating an API Route

Example: Menu API routes

```typescript
// app/api/menus/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MenuController } from '@/src/interfaces/http/controllers/MenuController';
import { createMenuSchema } from '@/src/interfaces/http/validation/menuSchemas';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';

const controller = new MenuController();

export async function GET(): Promise<NextResponse> {
  try {
    const result = await controller.list();
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const validatedData = createMenuSchema.parse(body);
    const result = await controller.create(validatedData);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
```

## Common Scenarios

### Scenario 1: Booking a Table for a Large Party

```bash
# Step 1: Check available tables
curl http://localhost:3000/api/tables

# Step 2: Create reservation
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "guestName": "Corporate Event",
    "guestEmail": "events@company.com",
    "guestPhone": "+1234567890",
    "date": "2024-12-31T00:00:00.000Z",
    "time": "20:00",
    "partySize": 12,
    "notes": "Company year-end party, need 2 large tables"
  }'

# Step 3: Confirm reservation
curl -X POST http://localhost:3000/api/reservations/{id}/confirm
```

### Scenario 2: Managing Walk-in Guests

```bash
# Create immediate reservation
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "guestName": "Walk-in Guest",
    "guestEmail": "walkin@restaurant.com",
    "guestPhone": "+1234567890",
    "date": "2024-01-10T00:00:00.000Z",
    "time": "12:30",
    "partySize": 2,
    "notes": "Walk-in, seated at table 5"
  }'

# Immediately confirm
curl -X POST http://localhost:3000/api/reservations/{id}/confirm
```

### Scenario 3: Handling Cancellations

```bash
# Cancel a reservation
curl -X POST http://localhost:3000/api/reservations/{id}/cancel
```

### Scenario 4: Daily Reservation Management

```bash
# Get all reservations for today
curl http://localhost:3000/api/reservations

# Filter by status in your application logic
# Confirm pending reservations
curl -X POST http://localhost:3000/api/reservations/{id}/confirm
```

## Testing Examples

### Unit Test for Domain Entity

```typescript
// src/domain/__tests__/Reservation.test.ts
import { Reservation } from '../entities/Reservation';
import { Email } from '../value-objects/Email';
import { ReservationStatus } from '../value-objects/ReservationStatus';

describe('Reservation Entity', () => {
  it('should create a valid reservation', () => {
    const reservation = new Reservation({
      guestName: 'John Doe',
      guestEmail: new Email('john@example.com'),
      date: new Date('2024-12-25'),
      time: '19:00',
      partySize: 4,
      status: ReservationStatus.pending(),
    });

    expect(reservation.guestName).toBe('John Doe');
    expect(reservation.partySize).toBe(4);
    expect(reservation.status.isPending()).toBe(true);
  });

  it('should throw error for invalid party size', () => {
    expect(() => {
      new Reservation({
        guestName: 'John Doe',
        guestEmail: new Email('john@example.com'),
        date: new Date('2024-12-25'),
        time: '19:00',
        partySize: 0,
        status: ReservationStatus.pending(),
      });
    }).toThrow('Party size must be at least 1');
  });

  it('should confirm a pending reservation', () => {
    const reservation = new Reservation({
      guestName: 'John Doe',
      guestEmail: new Email('john@example.com'),
      date: new Date('2024-12-25'),
      time: '19:00',
      partySize: 4,
      status: ReservationStatus.pending(),
    });

    reservation.confirm();
    expect(reservation.status.isConfirmed()).toBe(true);
  });

  it('should not confirm a cancelled reservation', () => {
    const reservation = new Reservation({
      guestName: 'John Doe',
      guestEmail: new Email('john@example.com'),
      date: new Date('2024-12-25'),
      time: '19:00',
      partySize: 4,
      status: ReservationStatus.cancelled(),
    });

    expect(() => reservation.confirm()).toThrow(
      'Cannot confirm a cancelled reservation'
    );
  });
});
```

### Integration Test for API

```typescript
// __tests__/api/reservations.test.ts
import { POST, GET } from '@/app/api/reservations/route';

describe('Reservations API', () => {
  it('should create a reservation', async () => {
    const request = new Request('http://localhost:3000/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guestName: 'Test User',
        guestEmail: 'test@example.com',
        date: '2024-12-25T00:00:00.000Z',
        time: '19:00',
        partySize: 4,
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.guestName).toBe('Test User');
    expect(data.status).toBe('pending');
  });

  it('should list all reservations', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('reservations');
    expect(data).toHaveProperty('total');
  });
});
```

## Using with JavaScript/Frontend

### Fetch API

```javascript
// Create a reservation
async function createReservation(data) {
  const response = await fetch('http://localhost:3000/api/reservations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}

// Usage
createReservation({
  guestName: 'John Doe',
  guestEmail: 'john@example.com',
  date: '2024-12-25T00:00:00.000Z',
  time: '19:00',
  partySize: 4,
})
  .then((reservation) => {
    console.log('Reservation created:', reservation);
  })
  .catch((error) => {
    console.error('Error:', error);
  });
```

### React Example

```typescript
// components/ReservationForm.tsx
import { useState } from 'react';

export function ReservationForm() {
  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    date: '',
    time: '',
    partySize: 2,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create reservation');
      }

      const reservation = await response.json();
      alert(`Reservation created! ID: ${reservation.id}`);
    } catch (error) {
      alert('Error creating reservation');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Name"
        value={formData.guestName}
        onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
      />
      <input
        type="email"
        placeholder="Email"
        value={formData.guestEmail}
        onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
      />
      <input
        type="date"
        value={formData.date}
        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
      />
      <input
        type="time"
        value={formData.time}
        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
      />
      <input
        type="number"
        min="1"
        max="50"
        value={formData.partySize}
        onChange={(e) => setFormData({ ...formData, partySize: parseInt(e.target.value) })}
      />
      <button type="submit">Create Reservation</button>
    </form>
  );
}
```

## Extending the System

For more examples on extending the system with new features, see:
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Detailed structure
- [CLAUDE.md](./CLAUDE.md) - Architecture principles
