# 🎯 START HERE - Reservely

**Welcome to Reservely!** This guide will get you started in the right direction.

## What is Reservely?

A production-ready **reservation management system** built with:
- ✅ **Clean Architecture** (strict layer separation)
- ✅ **TypeScript** (full type safety)
- ✅ **Next.js 14** (modern React framework)
- ✅ **PostgreSQL + Prisma** (robust database)

## 🚀 I Want To...

### → Get Running Quickly (5 minutes)
**Go to**: [QUICKSTART.md](./QUICKSTART.md)

```bash
npm install
docker-compose up -d
cp .env.example .env
npm run prisma:migrate
npm run dev
```

### → Understand the Architecture
**Go to**: [CLAUDE.md](./CLAUDE.md) then [ARCHITECTURE_SUMMARY.md](./ARCHITECTURE_SUMMARY.md)

The Golden Rule:
```
interfaces → application → domain
infrastructure → application → domain
domain → NOTHING
```

### → See the Full Setup
**Go to**: [SETUP.md](./SETUP.md)

Complete instructions with troubleshooting.

### → Use the API
**Go to**: [API.md](./API.md) or [EXAMPLES.md](./EXAMPLES.md)

Quick test:
```bash
curl http://localhost:3000/api/health
```

### → Add Features / Contribute
**Go to**: [CONTRIBUTING.md](./CONTRIBUTING.md)

Learn how to add features while maintaining clean architecture.

### → Deploy to Production
**Go to**: [DEPLOYMENT.md](./DEPLOYMENT.md)

Deploy to Vercel, AWS, or Docker.

### → Browse All Documentation
**Go to**: [INDEX.md](./INDEX.md)

Complete index of all documentation files.

## 📚 Documentation Map

```
Quick Start
├── START_HERE.md        ← You are here
├── QUICKSTART.md        ← 5-minute setup
└── SETUP.md             ← Detailed setup

Architecture
├── CLAUDE.md            ← Architecture contract (READ THIS!)
├── ARCHITECTURE_SUMMARY.md  ← Quick reference
└── PROJECT_STRUCTURE.md     ← Structure guide

Development
├── CONTRIBUTING.md      ← How to contribute
├── EXAMPLES.md          ← Code examples
└── API.md              ← API reference

Deployment
└── DEPLOYMENT.md        ← Production deployment

Reference
├── INDEX.md            ← Documentation index
└── SUMMARY.md          ← Project summary
```

## 🎓 Learning Path

### Day 1: Get It Running
1. Read this file (you're doing it! ✓)
2. Follow [QUICKSTART.md](./QUICKSTART.md)
3. Test the API endpoints
4. Browse the UI at http://localhost:3000

### Day 2: Understand Architecture
1. Read [CLAUDE.md](./CLAUDE.md) - The architecture contract
2. Review [ARCHITECTURE_SUMMARY.md](./ARCHITECTURE_SUMMARY.md)
3. Study [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
4. Explore the code in `src/domain/`

### Day 3: Learn the Codebase
1. Read [EXAMPLES.md](./EXAMPLES.md)
2. Review use cases in `src/application/use-cases/`
3. Study one complete flow: API → Controller → Use Case → Repository
4. Read layer-specific `CLAUDE.md` files

### Day 4: Make Changes
1. Read [CONTRIBUTING.md](./CONTRIBUTING.md)
2. Try adding a simple feature
3. Run tests: `npm test`
4. Follow the layer rules

### Day 5: Ready to Contribute!
You now understand:
- ✅ Clean architecture principles
- ✅ Layer boundaries
- ✅ How to add features
- ✅ Testing approach

## ⚡ Quick Commands

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

## 🏗️ Project Structure

```
reservely/
├── app/                 # Next.js App Router (pages & API routes)
├── src/
│   ├── domain/          # Business entities & rules (pure logic)
│   ├── application/     # Use cases (orchestration)
│   ├── infrastructure/  # Database & external services
│   └── interfaces/      # Controllers & HTTP handlers
├── prisma/              # Database schema & migrations
└── docs/                # This documentation
```

## 🎯 The Core Concept

### Clean Architecture in 30 Seconds

1. **Domain** = Pure business logic (no dependencies)
2. **Application** = Use cases (orchestrates domain)
3. **Infrastructure** = Database, APIs (implements interfaces)
4. **Interfaces** = HTTP routes (thin adapters)

**Rule**: Dependencies flow inward. Domain never imports anything.

### Example Flow

```
1. HTTP Request
   ↓
2. API Route (app/api/reservations/route.ts)
   ↓
3. Controller (src/interfaces/http/controllers/ReservationController.ts)
   ↓
4. Use Case (src/application/use-cases/CreateReservationUseCase.ts)
   ↓
5. Domain Entity (src/domain/entities/Reservation.ts)
   ↓
6. Repository Interface (src/domain/repositories/IReservationRepository.ts)
   ↓
7. Repository Implementation (src/infrastructure/repositories/PrismaReservationRepository.ts)
   ↓
8. Database (PostgreSQL via Prisma)
```

## ✅ What You Get

- ✅ Production-ready codebase
- ✅ Clean architecture (strictly enforced)
- ✅ Type-safe TypeScript
- ✅ RESTful API
- ✅ Database with migrations
- ✅ Docker support
- ✅ Testing setup
- ✅ Comprehensive documentation
- ✅ Deployment guides
- ✅ Code quality tools

## 🚨 Important Files

**Must Read:**
1. [CLAUDE.md](./CLAUDE.md) - Architecture rules (ABSOLUTE)
2. [QUICKSTART.md](./QUICKSTART.md) - Get running fast
3. [CONTRIBUTING.md](./CONTRIBUTING.md) - Before adding code

**Layer Rules:**
- `src/domain/CLAUDE.md` - Domain layer rules
- `src/application/CLAUDE.md` - Application layer rules
- `src/infrastructure/CLAUDE.md` - Infrastructure layer rules
- `src/interfaces/CLAUDE.md` - Interfaces layer rules

**Configuration:**
- `architecture.json` - Machine-readable architecture rules

## 🤔 Common Questions

**Q: Where do I put business logic?**
A: Domain layer (`src/domain/entities/` or `src/domain/services/`)

**Q: Where do I put database queries?**
A: Infrastructure layer (`src/infrastructure/repositories/`)

**Q: Where do I put API endpoints?**
A: App directory (`app/api/`)

**Q: Where do I put use cases?**
A: Application layer (`src/application/use-cases/`)

**Q: Can I import domain in controllers?**
A: NO! Controllers call use cases, which return DTOs

**Q: Can I use Prisma in use cases?**
A: NO! Use repository interfaces from domain

## 🎉 You're Ready!

**Next Step**: Choose your path above (👆) and get started!

### Quick Start Path
[QUICKSTART.md](./QUICKSTART.md) → Get running → Try API → Success! 🎉

### Learning Path
[CLAUDE.md](./CLAUDE.md) → [ARCHITECTURE_SUMMARY.md](./ARCHITECTURE_SUMMARY.md) → [EXAMPLES.md](./EXAMPLES.md) → Code!

### Building Path
[CONTRIBUTING.md](./CONTRIBUTING.md) → Add feature → Test → Deploy

## 📞 Need Help?

- **Setup issues**: [SETUP.md](./SETUP.md) troubleshooting section
- **Architecture questions**: [CLAUDE.md](./CLAUDE.md) or [ARCHITECTURE_SUMMARY.md](./ARCHITECTURE_SUMMARY.md)
- **API questions**: [API.md](./API.md)
- **Code examples**: [EXAMPLES.md](./EXAMPLES.md)
- **All docs**: [INDEX.md](./INDEX.md)

---

**Ready?** Pick a path above and dive in! 🚀

Most developers start here: **[QUICKSTART.md](./QUICKSTART.md)** ⚡
