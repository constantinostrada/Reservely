import { PrismaClient } from '@prisma/client';
import prisma from '../database/prisma';

// Repositories
import { PrismaReservationRepository } from '../repositories/PrismaReservationRepository';
import { PrismaTableRepository } from '../repositories/PrismaTableRepository';
import { PrismaUserRepository } from '../repositories/PrismaUserRepository';
import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { ITableRepository } from '@domain/repositories/ITableRepository';
import { IUserRepository } from '@domain/repositories/IUserRepository';

// Auth
import { JwtTokenService } from '../auth/JwtTokenService';
import { ScryptPasswordHasher } from '../auth/ScryptPasswordHasher';
import { ITokenService } from '@application/ports/ITokenService';
import { IPasswordHasher } from '@application/ports/IPasswordHasher';

// Domain Services
import { ReservationDomainService } from '@domain/services/ReservationDomainService';

// Use Cases
import { CreateReservationUseCase } from '@application/use-cases/CreateReservationUseCase';
import { GetReservationUseCase } from '@application/use-cases/GetReservationUseCase';
import { ListReservationsUseCase } from '@application/use-cases/ListReservationsUseCase';
import { ConfirmReservationUseCase } from '@application/use-cases/ConfirmReservationUseCase';
import { CancelReservationUseCase } from '@application/use-cases/CancelReservationUseCase';
import { CreateTableUseCase } from '@application/use-cases/CreateTableUseCase';
import { ListTablesUseCase } from '@application/use-cases/ListTablesUseCase';
import { LoginUseCase } from '@application/use-cases/LoginUseCase';
import { GetCurrentUserUseCase } from '@application/use-cases/GetCurrentUserUseCase';

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24; // 24h

/**
 * Simple dependency injection container
 * In a production app, consider using a DI library like tsyringe or inversify
 */
class Container {
  private static instance: Container;
  private prismaClient: PrismaClient;
  private reservationRepo?: IReservationRepository;
  private tableRepo?: ITableRepository;
  private userRepo?: IUserRepository;
  private tokenService?: ITokenService;
  private passwordHasher?: IPasswordHasher;
  private reservationDomainService?: ReservationDomainService;

  private constructor() {
    this.prismaClient = prisma;
  }

  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  // Repositories
  public getReservationRepository(): IReservationRepository {
    if (!this.reservationRepo) {
      this.reservationRepo = new PrismaReservationRepository(
        this.prismaClient
      );
    }
    return this.reservationRepo;
  }

  public getTableRepository(): ITableRepository {
    if (!this.tableRepo) {
      this.tableRepo = new PrismaTableRepository(this.prismaClient);
    }
    return this.tableRepo;
  }

  public getUserRepository(): IUserRepository {
    if (!this.userRepo) {
      this.userRepo = new PrismaUserRepository(this.prismaClient);
    }
    return this.userRepo;
  }

  // Auth services
  public getTokenService(): ITokenService {
    if (!this.tokenService) {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('JWT_SECRET must be set in production');
        }
        console.warn(
          'JWT_SECRET is not set; using an insecure development secret'
        );
      }
      const ttl = Number(process.env.JWT_EXPIRES_IN_SECONDS);
      this.tokenService = new JwtTokenService(
        secret || 'dev-only-insecure-secret',
        Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_TOKEN_TTL_SECONDS
      );
    }
    return this.tokenService;
  }

  public getPasswordHasher(): IPasswordHasher {
    if (!this.passwordHasher) {
      this.passwordHasher = new ScryptPasswordHasher();
    }
    return this.passwordHasher;
  }

  // Domain Services
  public getReservationDomainService(): ReservationDomainService {
    if (!this.reservationDomainService) {
      this.reservationDomainService = new ReservationDomainService();
    }
    return this.reservationDomainService;
  }

  // Use Cases
  public getCreateReservationUseCase(): CreateReservationUseCase {
    return new CreateReservationUseCase(
      this.getReservationRepository(),
      this.getTableRepository(),
      this.getReservationDomainService()
    );
  }

  public getGetReservationUseCase(): GetReservationUseCase {
    return new GetReservationUseCase(this.getReservationRepository());
  }

  public getListReservationsUseCase(): ListReservationsUseCase {
    return new ListReservationsUseCase(this.getReservationRepository());
  }

  public getConfirmReservationUseCase(): ConfirmReservationUseCase {
    return new ConfirmReservationUseCase(this.getReservationRepository());
  }

  public getCancelReservationUseCase(): CancelReservationUseCase {
    return new CancelReservationUseCase(this.getReservationRepository());
  }

  public getCreateTableUseCase(): CreateTableUseCase {
    return new CreateTableUseCase(this.getTableRepository());
  }

  public getListTablesUseCase(): ListTablesUseCase {
    return new ListTablesUseCase(this.getTableRepository());
  }

  public getLoginUseCase(): LoginUseCase {
    return new LoginUseCase(
      this.getUserRepository(),
      this.getPasswordHasher(),
      this.getTokenService()
    );
  }

  public getGetCurrentUserUseCase(): GetCurrentUserUseCase {
    return new GetCurrentUserUseCase(this.getUserRepository());
  }
}

export const container = Container.getInstance();
