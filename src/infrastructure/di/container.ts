import { PrismaClient } from '@prisma/client';
import prisma from '../database/prisma';

// Repositories
import { PrismaReservationRepository } from '../repositories/PrismaReservationRepository';
import { PrismaRestaurantRepository } from '../repositories/PrismaRestaurantRepository';
import { PrismaTableRepository } from '../repositories/PrismaTableRepository';
import { PrismaUserRepository } from '../repositories/PrismaUserRepository';
import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { IRestaurantRepository } from '@domain/repositories/IRestaurantRepository';
import { ITableRepository } from '@domain/repositories/ITableRepository';
import { IUserRepository } from '@domain/repositories/IUserRepository';

// Auth
import { JwtTokenService } from '../auth/JwtTokenService';
import { ScryptPasswordHasher } from '../auth/ScryptPasswordHasher';
import { ITokenService } from '@application/ports/ITokenService';
import { IPasswordHasher } from '@application/ports/IPasswordHasher';

// Domain Services
import { ReservationDomainService } from '@domain/services/ReservationDomainService';
import { AvailabilityService } from '@domain/services/AvailabilityService';

// Use Cases
import { CreateReservationUseCase } from '@application/use-cases/CreateReservationUseCase';
import { GetAvailabilityUseCase } from '@application/use-cases/GetAvailabilityUseCase';
import { GetReservationUseCase } from '@application/use-cases/GetReservationUseCase';
import { ListReservationsUseCase } from '@application/use-cases/ListReservationsUseCase';
import { ConfirmReservationUseCase } from '@application/use-cases/ConfirmReservationUseCase';
import { CancelReservationUseCase } from '@application/use-cases/CancelReservationUseCase';
import { CreateTableUseCase } from '@application/use-cases/CreateTableUseCase';
import { GetTableUseCase } from '@application/use-cases/GetTableUseCase';
import { ListTablesUseCase } from '@application/use-cases/ListTablesUseCase';
import { UpdateTableUseCase } from '@application/use-cases/UpdateTableUseCase';
import { DeleteTableUseCase } from '@application/use-cases/DeleteTableUseCase';
import { CreateRestaurantUseCase } from '@application/use-cases/CreateRestaurantUseCase';
import { GetRestaurantUseCase } from '@application/use-cases/GetRestaurantUseCase';
import { ListRestaurantsUseCase } from '@application/use-cases/ListRestaurantsUseCase';
import { UpdateRestaurantUseCase } from '@application/use-cases/UpdateRestaurantUseCase';
import { DeleteRestaurantUseCase } from '@application/use-cases/DeleteRestaurantUseCase';
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
  private restaurantRepo?: IRestaurantRepository;
  private tableRepo?: ITableRepository;
  private userRepo?: IUserRepository;
  private tokenService?: ITokenService;
  private passwordHasher?: IPasswordHasher;
  private reservationDomainService?: ReservationDomainService;
  private availabilityService?: AvailabilityService;

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
      this.reservationRepo = new PrismaReservationRepository(this.prismaClient);
    }
    return this.reservationRepo;
  }

  public getRestaurantRepository(): IRestaurantRepository {
    if (!this.restaurantRepo) {
      this.restaurantRepo = new PrismaRestaurantRepository(this.prismaClient);
    }
    return this.restaurantRepo;
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

  public getAvailabilityService(): AvailabilityService {
    if (!this.availabilityService) {
      this.availabilityService = new AvailabilityService();
    }
    return this.availabilityService;
  }

  // Use Cases
  public getCreateReservationUseCase(): CreateReservationUseCase {
    return new CreateReservationUseCase(
      this.getReservationRepository(),
      this.getTableRepository(),
      this.getRestaurantRepository(),
      this.getReservationDomainService(),
      this.getAvailabilityService()
    );
  }

  public getGetAvailabilityUseCase(): GetAvailabilityUseCase {
    return new GetAvailabilityUseCase(
      this.getReservationRepository(),
      this.getTableRepository(),
      this.getRestaurantRepository(),
      this.getAvailabilityService()
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

  public getGetTableUseCase(): GetTableUseCase {
    return new GetTableUseCase(this.getTableRepository());
  }

  public getListTablesUseCase(): ListTablesUseCase {
    return new ListTablesUseCase(this.getTableRepository());
  }

  public getUpdateTableUseCase(): UpdateTableUseCase {
    return new UpdateTableUseCase(this.getTableRepository());
  }

  public getDeleteTableUseCase(): DeleteTableUseCase {
    return new DeleteTableUseCase(this.getTableRepository());
  }

  public getCreateRestaurantUseCase(): CreateRestaurantUseCase {
    return new CreateRestaurantUseCase(this.getRestaurantRepository());
  }

  public getGetRestaurantUseCase(): GetRestaurantUseCase {
    return new GetRestaurantUseCase(this.getRestaurantRepository());
  }

  public getListRestaurantsUseCase(): ListRestaurantsUseCase {
    return new ListRestaurantsUseCase(this.getRestaurantRepository());
  }

  public getUpdateRestaurantUseCase(): UpdateRestaurantUseCase {
    return new UpdateRestaurantUseCase(this.getRestaurantRepository());
  }

  public getDeleteRestaurantUseCase(): DeleteRestaurantUseCase {
    return new DeleteRestaurantUseCase(this.getRestaurantRepository());
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
