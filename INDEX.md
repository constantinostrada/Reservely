# Reservely - Documentation Index

Complete guide to all documentation available in this project.

## 🚀 Getting Started

Start here if you're new to the project:

1. **[QUICKSTART.md](./QUICKSTART.md)** - Get running in 5 minutes
2. **[SETUP.md](./SETUP.md)** - Complete setup instructions
3. **[README.md](./README.md)** - Project overview and introduction

## 📚 Core Documentation

### Architecture

- **[CLAUDE.md](./CLAUDE.md)** - Global architecture contract (READ FIRST)
- **[architecture.json](./architecture.json)** - Machine-readable layer rules
- **[ARCHITECTURE_SUMMARY.md](./ARCHITECTURE_SUMMARY.md)** - Quick architecture reference
- **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Detailed project structure

### Layer-Specific Rules

- **[src/domain/CLAUDE.md](./src/domain/CLAUDE.md)** - Domain layer guidelines
- **[src/application/CLAUDE.md](./src/application/CLAUDE.md)** - Application layer guidelines
- **[src/infrastructure/CLAUDE.md](./src/infrastructure/CLAUDE.md)** - Infrastructure layer guidelines
- **[src/interfaces/CLAUDE.md](./src/interfaces/CLAUDE.md)** - Interfaces layer guidelines

## 🔧 Development

### For Developers

- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - How to contribute to the project
- **[EXAMPLES.md](./EXAMPLES.md)** - Code examples and usage patterns
- **[API.md](./API.md)** - Complete API reference

### Configuration

- **[package.json](./package.json)** - Dependencies and scripts
- **[tsconfig.json](./tsconfig.json)** - TypeScript configuration
- **[.eslintrc.json](./.eslintrc.json)** - ESLint rules
- **[.prettierrc](./.prettierrc)** - Code formatting rules
- **[next.config.js](./next.config.js)** - Next.js configuration

## 🚢 Deployment

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deploy to Vercel, AWS, Docker
- **[Dockerfile](./Dockerfile)** - Docker build configuration
- **[docker-compose.yml](./docker-compose.yml)** - Local Docker setup

## 📖 Reference

### API Documentation

- **[API.md](./API.md)** - Complete API endpoint reference
- **[EXAMPLES.md](./EXAMPLES.md)** - API usage examples with curl

### Database

- **[prisma/schema.prisma](./prisma/schema.prisma)** - Database schema
- **Migrations**: Handled by Prisma, see SETUP.md

## 🏗️ Architecture Deep Dive

### Understanding Clean Architecture

1. Start with **[CLAUDE.md](./CLAUDE.md)** - The architecture contract
2. Read **[ARCHITECTURE_SUMMARY.md](./ARCHITECTURE_SUMMARY.md)** - Quick reference
3. Study **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - How it's organized
4. Review **[EXAMPLES.md](./EXAMPLES.md)** - See it in action

### Layer-by-Layer Guide

#### Domain Layer (Business Logic)
- Location: `src/domain/`
- Rules: **[src/domain/CLAUDE.md](./src/domain/CLAUDE.md)**
- Contains:
  - Entities: `src/domain/entities/`
  - Value Objects: `src/domain/value-objects/`
  - Repository Interfaces: `src/domain/repositories/`
  - Domain Services: `src/domain/services/`
  - Exceptions: `src/domain/exceptions/`

#### Application Layer (Use Cases)
- Location: `src/application/`
- Rules: **[src/application/CLAUDE.md](./src/application/CLAUDE.md)**
- Contains:
  - Use Cases: `src/application/use-cases/`
  - DTOs: `src/application/dtos/`
  - Mappers: `src/application/mappers/`

#### Infrastructure Layer (External I/O)
- Location: `src/infrastructure/`
- Rules: **[src/infrastructure/CLAUDE.md](./src/infrastructure/CLAUDE.md)**
- Contains:
  - Repositories: `src/infrastructure/repositories/`
  - Database: `src/infrastructure/database/`
  - DI Container: `src/infrastructure/di/`

#### Interfaces Layer (Entry Points)
- Location: `src/interfaces/`
- Rules: **[src/interfaces/CLAUDE.md](./src/interfaces/CLAUDE.md)**
- Contains:
  - Controllers: `src/interfaces/http/controllers/`
  - Validation: `src/interfaces/http/validation/`
  - Error Handling: `src/interfaces/http/utils/`

## 🎯 Common Tasks

### I want to...

#### Get Started
→ **[QUICKSTART.md](./QUICKSTART.md)** or **[SETUP.md](./SETUP.md)**

#### Understand the Architecture
→ **[CLAUDE.md](./CLAUDE.md)** then **[ARCHITECTURE_SUMMARY.md](./ARCHITECTURE_SUMMARY.md)**

#### Add a New Feature
→ **[CONTRIBUTING.md](./CONTRIBUTING.md)** section "Adding a New Feature"

#### Use the API
→ **[API.md](./API.md)** or **[EXAMPLES.md](./EXAMPLES.md)**

#### Deploy the Application
→ **[DEPLOYMENT.md](./DEPLOYMENT.md)**

#### Run Tests
→ **[SETUP.md](./SETUP.md)** section "Testing"

#### Understand a Layer
→ Check the specific `src/{layer}/CLAUDE.md` file

#### See Code Examples
→ **[EXAMPLES.md](./EXAMPLES.md)**

#### Troubleshoot Issues
→ **[SETUP.md](./SETUP.md)** section "Troubleshooting"

## 📁 File Structure Overview

```
reservely/
├── Documentation (you are here)
│   ├── INDEX.md                  ← This file
│   ├── README.md                 ← Project overview
│   ├── QUICKSTART.md             ← 5-minute setup
│   ├── SETUP.md                  ← Detailed setup
│   ├── CLAUDE.md                 ← Architecture contract
│   ├── ARCHITECTURE_SUMMARY.md   ← Architecture reference
│   ├── PROJECT_STRUCTURE.md      ← Structure guide
│   ├── API.md                    ← API documentation
│   ├── EXAMPLES.md               ← Code examples
│   ├── CONTRIBUTING.md           ← Contribution guide
│   └── DEPLOYMENT.md             ← Deployment guide
│
├── Source Code
│   ├── src/domain/               ← Business logic
│   ├── src/application/          ← Use cases
│   ├── src/infrastructure/       ← External I/O
│   ├── src/interfaces/           ← HTTP controllers
│   └── app/                      ← Next.js routes
│
├── Configuration
│   ├── package.json              ← Dependencies
│   ├── tsconfig.json             ← TypeScript config
│   ├── next.config.js            ← Next.js config
│   ├── .eslintrc.json            ← Linting rules
│   ├── .prettierrc               ← Formatting rules
│   └── prisma/schema.prisma      ← Database schema
│
└── Docker
    ├── Dockerfile                ← Docker build
    └── docker-compose.yml        ← Local development
```

## 🧪 Testing Documentation

- **Unit Tests**: Domain and use case tests in `__tests__/` directories
- **Jest Configuration**: **[jest.config.js](./jest.config.js)**
- **Test Examples**: **[EXAMPLES.md](./EXAMPLES.md)** section "Testing Examples"

## 🔐 Security & Best Practices

- Never commit `.env` files
- Use environment variables for secrets
- Follow TypeScript strict mode
- No `any` types allowed
- Validate all external input in interfaces layer
- Keep business logic in domain layer

## 📦 Dependencies

### Production
- Next.js 14 - React framework
- Prisma - Database ORM
- PostgreSQL - Database
- Zod - Validation
- TypeScript - Type safety

### Development
- ESLint - Code linting
- Prettier - Code formatting
- Jest - Testing framework

See **[package.json](./package.json)** for complete list.

## 🤝 Contributing

Want to contribute? Read these in order:

1. **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines
2. **[CLAUDE.md](./CLAUDE.md)** - Architecture rules
3. **[ARCHITECTURE_SUMMARY.md](./ARCHITECTURE_SUMMARY.md)** - Quick reference
4. **[EXAMPLES.md](./EXAMPLES.md)** - Code patterns

## 📞 Support

### Having Issues?

1. Check **[SETUP.md](./SETUP.md)** troubleshooting section
2. Review **[QUICKSTART.md](./QUICKSTART.md)** for common mistakes
3. Search existing GitHub issues
4. Create a new issue with:
   - Error message
   - Steps to reproduce
   - Environment details (OS, Node version, etc.)

### Questions About...

- **Architecture**: See **[CLAUDE.md](./CLAUDE.md)** or **[ARCHITECTURE_SUMMARY.md](./ARCHITECTURE_SUMMARY.md)**
- **Setup**: See **[SETUP.md](./SETUP.md)**
- **API**: See **[API.md](./API.md)**
- **Code Examples**: See **[EXAMPLES.md](./EXAMPLES.md)**
- **Deployment**: See **[DEPLOYMENT.md](./DEPLOYMENT.md)**

## 🎓 Learning Path

### For New Contributors

1. **Day 1**: Read **[README.md](./README.md)** and **[QUICKSTART.md](./QUICKSTART.md)**
2. **Day 2**: Study **[CLAUDE.md](./CLAUDE.md)** and **[ARCHITECTURE_SUMMARY.md](./ARCHITECTURE_SUMMARY.md)**
3. **Day 3**: Explore codebase using **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)**
4. **Day 4**: Try examples from **[EXAMPLES.md](./EXAMPLES.md)**
5. **Day 5**: Make your first contribution using **[CONTRIBUTING.md](./CONTRIBUTING.md)**

### For Architects

- **[CLAUDE.md](./CLAUDE.md)** - Complete architecture contract
- **[architecture.json](./architecture.json)** - Machine-readable rules
- **[ARCHITECTURE_SUMMARY.md](./ARCHITECTURE_SUMMARY.md)** - Quick reference
- Layer-specific `CLAUDE.md` files in each `src/` directory

### For API Consumers

- **[QUICKSTART.md](./QUICKSTART.md)** - Get API running
- **[API.md](./API.md)** - Complete endpoint reference
- **[EXAMPLES.md](./EXAMPLES.md)** - Usage examples with curl

## 📝 Document Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| README.md | ✅ Complete | 2024-01 |
| QUICKSTART.md | ✅ Complete | 2024-01 |
| SETUP.md | ✅ Complete | 2024-01 |
| CLAUDE.md | ✅ Complete | Pre-existing |
| ARCHITECTURE_SUMMARY.md | ✅ Complete | 2024-01 |
| PROJECT_STRUCTURE.md | ✅ Complete | 2024-01 |
| API.md | ✅ Complete | 2024-01 |
| EXAMPLES.md | ✅ Complete | 2024-01 |
| CONTRIBUTING.md | ✅ Complete | 2024-01 |
| DEPLOYMENT.md | ✅ Complete | 2024-01 |

## 🔗 External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Clean Architecture (Robert C. Martin)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

## 📜 License

This project is licensed under the MIT License - see the **[LICENSE](./LICENSE)** file for details.

---

**Need help?** Start with **[QUICKSTART.md](./QUICKSTART.md)** or **[SETUP.md](./SETUP.md)**

**Want to understand the architecture?** Read **[CLAUDE.md](./CLAUDE.md)**

**Ready to code?** Check **[EXAMPLES.md](./EXAMPLES.md)** and **[CONTRIBUTING.md](./CONTRIBUTING.md)**
