import { PrismaClient } from '@prisma/client';
import prisma from '../database/prisma';

// Repositories
import { PrismaReservationRepository } from '../repositories/PrismaReservationRepository';
import { PrismaTableRepository } from '../repositories/PrismaTableRepository';
import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { ITableRepository } from '@domain/repositories/ITableRepository';

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

/**
 * Simple dependency injection container
 * In a production app, consider using a DI library like tsyringe or inversify
 */
class Container {
  private static instance: Container;
  private prismaClient: PrismaClient;
  private reservationRepo?: IReservationRepository;
  private tableRepo?: ITableRepository;
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
}

export const container = Container.getInstance();
