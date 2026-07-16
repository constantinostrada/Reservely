# Reservely - Quick Start Guide

Get Reservely up and running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed
- npm 9+ installed

## Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL="postgresql://user:password@localhost:5432/reservely?schema=public"
```

**Using Docker (Recommended):**

```bash
# Start PostgreSQL in Docker
docker-compose up -d

# Your .env should use:
# DATABASE_URL="postgresql://reservely:reservely@localhost:5432/reservely?schema=public"
```

### 3. Run Migrations

```bash
npm run prisma:migrate
npm run prisma:generate
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Test the API

### Create a Table

```bash
curl -X POST http://localhost:3000/api/tables \
  -H "Content-Type: application/json" \
  -d '{"tableNumber": 1, "capacity": 4, "location": "Window"}'
```

### Create a Reservation

```bash
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "guestName": "John Doe",
    "guestEmail": "john@example.com",
    "date": "2024-12-25T00:00:00.000Z",
    "time": "19:00",
    "partySize": 4
  }'
```

### List Reservations

```bash
curl http://localhost:3000/api/reservations
```

## Health Check

```bash
curl http://localhost:3000/api/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-10T10:00:00.000Z",
  "database": "connected"
}
```

## Next Steps

- **Read the Architecture**: [CLAUDE.md](./CLAUDE.md)
- **Full Documentation**: [README.md](./README.md)
- **API Reference**: [API.md](./API.md)
- **Code Examples**: [EXAMPLES.md](./EXAMPLES.md)
- **Detailed Setup**: [SETUP.md](./SETUP.md)

## Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio
npm run prisma:generate  # Generate Prisma client

# Code Quality
npm run lint             # Run linter
npm run format           # Format code
npm run type-check       # Check TypeScript

# Testing
npm test                 # Run tests
npm run test:coverage    # Run with coverage
```

## Troubleshooting

**Database connection failed:**
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Try: `docker-compose up -d`

**Port 3000 already in use:**
- Change PORT in .env
- Or kill process: `lsof -ti:3000 | xargs kill`

**Prisma errors:**
```bash
rm -rf node_modules
npm install
npm run prisma:generate
```

## Project Structure

```
reservely/
├── app/              # Next.js pages and API routes
├── src/
│   ├── domain/       # Business entities and rules
│   ├── application/  # Use cases
│   ├── infrastructure/ # Database and external services
│   └── interfaces/   # Controllers and HTTP handlers
├── prisma/           # Database schema
└── ...config files
```

## Architecture at a Glance

```
interfaces → application → domain
infrastructure → application → domain
```

- **Domain**: Pure business logic, zero dependencies
- **Application**: Use cases that orchestrate domain
- **Infrastructure**: Database, APIs, external services
- **Interfaces**: HTTP routes, controllers, validation

## Learn More

- [Clean Architecture](./CLAUDE.md)
- [Full Setup Guide](./SETUP.md)
- [API Documentation](./API.md)
- [Contributing](./CONTRIBUTING.md)
- [Deployment](./DEPLOYMENT.md)

## Support

Having issues? Check:
1. [SETUP.md](./SETUP.md) troubleshooting section
2. GitHub issues
3. Create a new issue with details

---

**That's it!** You're ready to build with Reservely. 🎉
