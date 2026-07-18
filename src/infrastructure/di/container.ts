import { PrismaClient } from '@prisma/client';
import prisma from '../database/prisma';

// Repositories
import { PrismaReservationRepository } from '../repositories/PrismaReservationRepository';
import { PrismaRestaurantRepository } from '../repositories/PrismaRestaurantRepository';
import { PrismaTableRepository } from '../repositories/PrismaTableRepository';
import { PrismaUserRepository } from '../repositories/PrismaUserRepository';
import { PrismaMenuItemRepository } from '../repositories/PrismaMenuItemRepository';
import { PrismaOrderRepository } from '../repositories/PrismaOrderRepository';
import { PrismaPaymentRepository } from '../repositories/PrismaPaymentRepository';
import { PrismaWaitlistRepository } from '../repositories/PrismaWaitlistRepository';
import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { IWaitlistRepository } from '@domain/repositories/IWaitlistRepository';
import { IRestaurantRepository } from '@domain/repositories/IRestaurantRepository';
import { ITableRepository } from '@domain/repositories/ITableRepository';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { IMenuItemRepository } from '@domain/repositories/IMenuItemRepository';
import { IOrderRepository } from '@domain/repositories/IOrderRepository';
import { IPaymentRepository } from '@domain/repositories/IPaymentRepository';

// Payments
import { MockPaymentProvider } from '../payments/MockPaymentProvider';
import { IPaymentProvider } from '@application/ports/IPaymentProvider';

// Events & Notifications
import { InProcessEventDispatcher } from '../events/InProcessEventDispatcher';
import { MockNotificationSender } from '../notifications/MockNotificationSender';
import { IEventPublisher } from '@application/ports/IEventPublisher';
import { INotificationSender } from '@application/ports/INotificationSender';
import { NotificationDispatcher } from '@application/services/NotificationDispatcher';

// Auth
import { JwtTokenService } from '../auth/JwtTokenService';
import { ScryptPasswordHasher } from '../auth/ScryptPasswordHasher';
import { ITokenService } from '@application/ports/ITokenService';
import { IPasswordHasher } from '@application/ports/IPasswordHasher';

// Domain Services
import { ReservationDomainService } from '@domain/services/ReservationDomainService';
import { AvailabilityService } from '@domain/services/AvailabilityService';
import { TableCombinationService } from '@domain/services/TableCombinationService';
import { BillSplitService } from '@domain/services/BillSplitService';

// Use Cases
import { CreateReservationUseCase } from '@application/use-cases/CreateReservationUseCase';
import { GetAvailabilityUseCase } from '@application/use-cases/GetAvailabilityUseCase';
import { GetReservationUseCase } from '@application/use-cases/GetReservationUseCase';
import { ListReservationsUseCase } from '@application/use-cases/ListReservationsUseCase';
import { ConfirmReservationUseCase } from '@application/use-cases/ConfirmReservationUseCase';
import { CancelReservationUseCase } from '@application/use-cases/CancelReservationUseCase';
import { MarkNoShowReservationsUseCase } from '@application/use-cases/MarkNoShowReservationsUseCase';
import { ModifyReservationUseCase } from '@application/use-cases/ModifyReservationUseCase';
import { JoinWaitlistUseCase } from '@application/use-cases/JoinWaitlistUseCase';
import { ListWaitlistUseCase } from '@application/use-cases/ListWaitlistUseCase';
import { CleanupExpiredWaitlistUseCase } from '@application/use-cases/CleanupExpiredWaitlistUseCase';
import { CreateTableUseCase } from '@application/use-cases/CreateTableUseCase';
import { GetTableUseCase } from '@application/use-cases/GetTableUseCase';
import { ListTablesUseCase } from '@application/use-cases/ListTablesUseCase';
import { UpdateTableUseCase } from '@application/use-cases/UpdateTableUseCase';
import { DeleteTableUseCase } from '@application/use-cases/DeleteTableUseCase';
import { CreateRestaurantUseCase } from '@application/use-cases/CreateRestaurantUseCase';
import { GetRestaurantUseCase } from '@application/use-cases/GetRestaurantUseCase';
import { ListRestaurantsUseCase } from '@application/use-cases/ListRestaurantsUseCase';
import { ListPublicRestaurantsUseCase } from '@application/use-cases/ListPublicRestaurantsUseCase';
import { GetPublicRestaurantUseCase } from '@application/use-cases/GetPublicRestaurantUseCase';
import { UpdateRestaurantUseCase } from '@application/use-cases/UpdateRestaurantUseCase';
import { DeleteRestaurantUseCase } from '@application/use-cases/DeleteRestaurantUseCase';
import { LoginUseCase } from '@application/use-cases/LoginUseCase';
import { GetCurrentUserUseCase } from '@application/use-cases/GetCurrentUserUseCase';
import { CreateMenuItemUseCase } from '@application/use-cases/CreateMenuItemUseCase';
import { GetMenuItemUseCase } from '@application/use-cases/GetMenuItemUseCase';
import { ListMenuItemsUseCase } from '@application/use-cases/ListMenuItemsUseCase';
import { UpdateMenuItemUseCase } from '@application/use-cases/UpdateMenuItemUseCase';
import { DeleteMenuItemUseCase } from '@application/use-cases/DeleteMenuItemUseCase';
import { PlaceOrderUseCase } from '@application/use-cases/PlaceOrderUseCase';
import { GetOrderUseCase } from '@application/use-cases/GetOrderUseCase';
import { ListOrdersUseCase } from '@application/use-cases/ListOrdersUseCase';
import { SplitBillUseCase } from '@application/use-cases/SplitBillUseCase';
import { ChargeBillUseCase } from '@application/use-cases/ChargeBillUseCase';
import { HandlePaymentWebhookUseCase } from '@application/use-cases/HandlePaymentWebhookUseCase';
import { ListOrderPaymentsUseCase } from '@application/use-cases/ListOrderPaymentsUseCase';
import { ListPaymentsUseCase } from '@application/use-cases/ListPaymentsUseCase';

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24; // 24h

/**
 * Simple dependency injection container
 * In a production app, consider using a DI library like tsyringe or inversify
 */
class Container {
  private static instance: Container;
  private prismaClient: PrismaClient;
  private reservationRepo?: IReservationRepository;
  private waitlistRepo?: IWaitlistRepository;
  private restaurantRepo?: IRestaurantRepository;
  private tableRepo?: ITableRepository;
  private userRepo?: IUserRepository;
  private menuItemRepo?: IMenuItemRepository;
  private orderRepo?: IOrderRepository;
  private paymentRepo?: IPaymentRepository;
  private paymentProvider?: IPaymentProvider;
  private eventDispatcher?: InProcessEventDispatcher;
  private notificationSender?: INotificationSender;
  private tokenService?: ITokenService;
  private passwordHasher?: IPasswordHasher;
  private reservationDomainService?: ReservationDomainService;
  private availabilityService?: AvailabilityService;
  private tableCombinationService?: TableCombinationService;
  private billSplitService?: BillSplitService;

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

  public getWaitlistRepository(): IWaitlistRepository {
    if (!this.waitlistRepo) {
      this.waitlistRepo = new PrismaWaitlistRepository(this.prismaClient);
    }
    return this.waitlistRepo;
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

  public getMenuItemRepository(): IMenuItemRepository {
    if (!this.menuItemRepo) {
      this.menuItemRepo = new PrismaMenuItemRepository(this.prismaClient);
    }
    return this.menuItemRepo;
  }

  public getOrderRepository(): IOrderRepository {
    if (!this.orderRepo) {
      this.orderRepo = new PrismaOrderRepository(this.prismaClient);
    }
    return this.orderRepo;
  }

  public getPaymentRepository(): IPaymentRepository {
    if (!this.paymentRepo) {
      this.paymentRepo = new PrismaPaymentRepository(this.prismaClient);
    }
    return this.paymentRepo;
  }

  // Payments
  public getPaymentProvider(): IPaymentProvider {
    if (!this.paymentProvider) {
      this.paymentProvider = new MockPaymentProvider();
    }
    return this.paymentProvider;
  }

  // Events & Notifications
  public getNotificationSender(): INotificationSender {
    if (!this.notificationSender) {
      this.notificationSender = new MockNotificationSender();
    }
    return this.notificationSender;
  }

  public getEventPublisher(): IEventPublisher {
    if (!this.eventDispatcher) {
      this.eventDispatcher = new InProcessEventDispatcher();
      const notifications = new NotificationDispatcher(
        this.getNotificationSender(),
        this.getOrderRepository(),
        this.getReservationRepository()
      );
      this.eventDispatcher.subscribe((event) => notifications.handle(event));
    }
    return this.eventDispatcher;
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

  public getTableCombinationService(): TableCombinationService {
    if (!this.tableCombinationService) {
      this.tableCombinationService = new TableCombinationService();
    }
    return this.tableCombinationService;
  }

  public getBillSplitService(): BillSplitService {
    if (!this.billSplitService) {
      this.billSplitService = new BillSplitService();
    }
    return this.billSplitService;
  }

  // Use Cases
  public getCreateReservationUseCase(): CreateReservationUseCase {
    return new CreateReservationUseCase(
      this.getReservationRepository(),
      this.getTableRepository(),
      this.getRestaurantRepository(),
      this.getReservationDomainService(),
      this.getAvailabilityService(),
      this.getTableCombinationService()
    );
  }

  public getGetAvailabilityUseCase(): GetAvailabilityUseCase {
    return new GetAvailabilityUseCase(
      this.getReservationRepository(),
      this.getTableRepository(),
      this.getRestaurantRepository(),
      this.getAvailabilityService(),
      this.getTableCombinationService()
    );
  }

  public getGetReservationUseCase(): GetReservationUseCase {
    return new GetReservationUseCase(this.getReservationRepository());
  }

  public getListReservationsUseCase(): ListReservationsUseCase {
    return new ListReservationsUseCase(this.getReservationRepository());
  }

  public getConfirmReservationUseCase(): ConfirmReservationUseCase {
    return new ConfirmReservationUseCase(
      this.getReservationRepository(),
      this.getEventPublisher()
    );
  }

  public getCancelReservationUseCase(): CancelReservationUseCase {
    return new CancelReservationUseCase(
      this.getReservationRepository(),
      this.getWaitlistRepository(),
      this.getEventPublisher()
    );
  }

  public getModifyReservationUseCase(): ModifyReservationUseCase {
    return new ModifyReservationUseCase(
      this.getReservationRepository(),
      this.getTableRepository(),
      this.getRestaurantRepository(),
      this.getReservationDomainService(),
      this.getAvailabilityService(),
      this.getTableCombinationService(),
      this.getWaitlistRepository(),
      this.getEventPublisher()
    );
  }

  public getMarkNoShowReservationsUseCase(): MarkNoShowReservationsUseCase {
    return new MarkNoShowReservationsUseCase(
      this.getReservationRepository(),
      this.getRestaurantRepository(),
      this.getWaitlistRepository(),
      this.getEventPublisher()
    );
  }

  public getJoinWaitlistUseCase(): JoinWaitlistUseCase {
    return new JoinWaitlistUseCase(
      this.getWaitlistRepository(),
      this.getReservationRepository(),
      this.getTableRepository(),
      this.getRestaurantRepository(),
      this.getAvailabilityService()
    );
  }

  public getListWaitlistUseCase(): ListWaitlistUseCase {
    return new ListWaitlistUseCase(this.getWaitlistRepository());
  }

  public getCleanupExpiredWaitlistUseCase(): CleanupExpiredWaitlistUseCase {
    return new CleanupExpiredWaitlistUseCase(this.getWaitlistRepository());
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

  public getListPublicRestaurantsUseCase(): ListPublicRestaurantsUseCase {
    return new ListPublicRestaurantsUseCase(this.getRestaurantRepository());
  }

  public getGetPublicRestaurantUseCase(): GetPublicRestaurantUseCase {
    return new GetPublicRestaurantUseCase(this.getRestaurantRepository());
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

  public getCreateMenuItemUseCase(): CreateMenuItemUseCase {
    return new CreateMenuItemUseCase(this.getMenuItemRepository());
  }

  public getGetMenuItemUseCase(): GetMenuItemUseCase {
    return new GetMenuItemUseCase(this.getMenuItemRepository());
  }

  public getListMenuItemsUseCase(): ListMenuItemsUseCase {
    return new ListMenuItemsUseCase(this.getMenuItemRepository());
  }

  public getUpdateMenuItemUseCase(): UpdateMenuItemUseCase {
    return new UpdateMenuItemUseCase(this.getMenuItemRepository());
  }

  public getDeleteMenuItemUseCase(): DeleteMenuItemUseCase {
    return new DeleteMenuItemUseCase(this.getMenuItemRepository());
  }

  public getPlaceOrderUseCase(): PlaceOrderUseCase {
    return new PlaceOrderUseCase(
      this.getOrderRepository(),
      this.getReservationRepository(),
      this.getMenuItemRepository()
    );
  }

  public getGetOrderUseCase(): GetOrderUseCase {
    return new GetOrderUseCase(this.getOrderRepository());
  }

  public getListOrdersUseCase(): ListOrdersUseCase {
    return new ListOrdersUseCase(this.getOrderRepository());
  }

  public getSplitBillUseCase(): SplitBillUseCase {
    return new SplitBillUseCase(
      this.getOrderRepository(),
      this.getBillSplitService()
    );
  }

  public getChargeBillUseCase(): ChargeBillUseCase {
    return new ChargeBillUseCase(
      this.getPaymentRepository(),
      this.getOrderRepository(),
      this.getPaymentProvider()
    );
  }

  public getHandlePaymentWebhookUseCase(): HandlePaymentWebhookUseCase {
    return new HandlePaymentWebhookUseCase(
      this.getPaymentRepository(),
      this.getEventPublisher()
    );
  }

  public getListOrderPaymentsUseCase(): ListOrderPaymentsUseCase {
    return new ListOrderPaymentsUseCase(
      this.getPaymentRepository(),
      this.getOrderRepository()
    );
  }

  public getListPaymentsUseCase(): ListPaymentsUseCase {
    return new ListPaymentsUseCase(this.getPaymentRepository());
  }
}

export const container = Container.getInstance();
