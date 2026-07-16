# Reservely Setup Guide

Complete setup instructions for getting Reservely up and running.

## Prerequisites

Ensure you have the following installed:

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **PostgreSQL**: v14 or higher
- **Git**: Latest version

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd reservely
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js
- TypeScript
- Prisma
- Zod
- And all development dependencies

### 3. Set Up PostgreSQL Database

#### Option A: Local PostgreSQL

1. Install PostgreSQL if not already installed
2. Create a new database:

```bash
psql -U postgres
CREATE DATABASE reservely;
\q
```

#### Option B: Docker

```bash
docker run --name reservely-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=reservely \
  -p 5432:5432 \
  -d postgres:14
```

### 4. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/reservely?schema=public"
NODE_ENV="development"
PORT=3000
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Replace:**
- `user` - your PostgreSQL username
- `password` - your PostgreSQL password
- `localhost:5432` - your PostgreSQL host and port

### 5. Run Database Migrations

Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

This will:
- Generate the Prisma client
- Create the database schema
- Set up the tables

### 6. Verify Setup

Check that everything is working:

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Format check
npm run format:check
```

### 7. Start Development Server

```bash
npm run dev
```

The application will be available at: `http://localhost:3000`

### 8. Verify API

Test the health endpoint:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-10T10:00:00.000Z",
  "database": "connected"
}
```

## Testing the API

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

### Create a Reservation

```bash
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "guestName": "John Doe",
    "guestEmail": "john@example.com",
    "guestPhone": "+1234567890",
    "date": "2024-12-25T00:00:00.000Z",
    "time": "18:30",
    "partySize": 4,
    "notes": "Window seat preferred"
  }'
```

### List Reservations

```bash
curl http://localhost:3000/api/reservations
```

## Database Management

### Prisma Studio

View and edit your data with Prisma Studio:

```bash
npm run prisma:studio
```

Access at: `http://localhost:5555`

### Reset Database

To reset your database (⚠️ WARNING: This deletes all data):

```bash
npx prisma migrate reset
```

### Create Migration

After modifying `prisma/schema.prisma`:

```bash
npx prisma migrate dev --name your_migration_name
```

## Development Tools

### Format Code

```bash
npm run format
```

### Run Linter

```bash
npm run lint
```

### Type Check

```bash
npm run type-check
```

### Run All Checks

```bash
npm run lint && npm run type-check && npm run format:check
```

## Building for Production

### Build

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

## Troubleshooting

### Database Connection Issues

1. **Check PostgreSQL is running:**
```bash
pg_isready
```

2. **Verify DATABASE_URL format:**
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA
```

3. **Test connection:**
```bash
npx prisma db push
```

### Port Already in Use

If port 3000 is in use, change it in `.env`:
```env
PORT=3001
```

### Prisma Issues

1. **Regenerate Prisma client:**
```bash
npx prisma generate
```

2. **Reset Prisma:**
```bash
npx prisma migrate reset
npx prisma generate
```

### TypeScript Errors

Clear Next.js cache:
```bash
rm -rf .next
npm run build
```

### Module Resolution Issues

Clear all caches and reinstall:
```bash
rm -rf node_modules
rm package-lock.json
npm install
```

## Environment-Specific Setup

### Development
- Hot reload enabled
- Detailed error messages
- Prisma Studio available

### Production
- Optimized build
- Error tracking recommended
- Environment variables secured
- HTTPS recommended

## Next Steps

1. Read `CLAUDE.md` for architecture guidelines
2. Check `API.md` for API documentation
3. Review `CONTRIBUTING.md` for contribution guidelines
4. Explore the codebase starting from `src/domain/`

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

## Getting Help

If you encounter issues:

1. Check this setup guide
2. Review the troubleshooting section
3. Check existing GitHub issues
4. Create a new issue with:
   - Error message
   - Steps to reproduce
   - Environment details
