/**
 * The single typed API client for the web UI. All screens call the backend
 * through `api.*` — never through raw fetch. Types are the application-layer
 * DTOs (type-only imports, erased at compile time), so the UI and the
 * backend share one contract.
 */
import type {
  AuthUserDTO,
  LoginDTO,
  LoginResultDTO,
} from '@application/dtos/AuthDTO';
import type {
  AvailabilityDTO,
  GetAvailabilityDTO,
} from '@application/dtos/AvailabilityDTO';
import type {
  CreateReservationDTO,
  ReservationDTO,
  ReservationListDTO,
} from '@application/dtos/ReservationDTO';
import type { MenuItemListDTO } from '@application/dtos/MenuItemDTO';
import type {
  BillSplitDTO,
  OrderDTO,
  OrderListDTO,
  PlaceOrderDTO,
} from '@application/dtos/OrderDTO';
import type {
  ChargeBillDTO,
  PaymentDTO,
  PaymentListDTO,
  PaymentWebhookResultDTO,
} from '@application/dtos/PaymentDTO';
import type {
  CreateRestaurantDTO,
  RestaurantDTO,
  RestaurantListDTO,
  UpdateRestaurantDTO,
} from '@application/dtos/RestaurantDTO';
import type {
  CreateTableDTO,
  TableDTO,
  TableListDTO,
  UpdateTableDTO,
} from '@application/dtos/TableDTO';
import { request } from './http';

export const api = {
  auth: {
    login: (input: LoginDTO) =>
      request<LoginResultDTO>('/api/auth/login', {
        method: 'POST',
        body: input,
      }),
    logout: () =>
      request<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
    me: () => request<AuthUserDTO>('/api/auth/me'),
  },

  restaurants: {
    list: () => request<RestaurantListDTO>('/api/restaurants'),
    get: (id: string) => request<RestaurantDTO>(`/api/restaurants/${id}`),
    // Public onboarding endpoint: creates the tenant itself
    create: (input: CreateRestaurantDTO) =>
      request<RestaurantDTO>('/api/restaurants', {
        method: 'POST',
        body: input,
      }),
    update: (id: string, input: UpdateRestaurantDTO) =>
      request<RestaurantDTO>(`/api/restaurants/${id}`, {
        method: 'PATCH',
        body: input,
      }),
    remove: (id: string) =>
      request<void>(`/api/restaurants/${id}`, { method: 'DELETE' }),
  },

  tables: {
    list: () => request<TableListDTO>('/api/tables'),
    get: (id: string) => request<TableDTO>(`/api/tables/${id}`),
    create: (input: CreateTableDTO) =>
      request<TableDTO>('/api/tables', { method: 'POST', body: input }),
    update: (id: string, input: UpdateTableDTO) =>
      request<TableDTO>(`/api/tables/${id}`, { method: 'PATCH', body: input }),
    remove: (id: string) =>
      request<void>(`/api/tables/${id}`, { method: 'DELETE' }),
  },

  reservations: {
    list: () => request<ReservationListDTO>('/api/reservations'),
    get: (id: string) => request<ReservationDTO>(`/api/reservations/${id}`),
    create: (input: CreateReservationDTO) =>
      request<ReservationDTO>('/api/reservations', {
        method: 'POST',
        body: input,
      }),
    confirm: (id: string) =>
      request<ReservationDTO>(`/api/reservations/${id}/confirm`, {
        method: 'POST',
      }),
    cancel: (id: string) =>
      request<ReservationDTO>(`/api/reservations/${id}/cancel`, {
        method: 'POST',
      }),
  },

  availability: {
    get: (query: GetAvailabilityDTO) =>
      request<AvailabilityDTO>('/api/availability', {
        query: { date: query.date, partySize: query.partySize },
      }),
  },

  menuItems: {
    list: () => request<MenuItemListDTO>('/api/menu-items'),
  },

  orders: {
    list: (reservationId?: string) =>
      request<OrderListDTO>('/api/orders', {
        query: reservationId ? { reservationId } : undefined,
      }),
    get: (id: string) => request<OrderDTO>(`/api/orders/${id}`),
    place: (input: PlaceOrderDTO) =>
      request<OrderDTO>('/api/orders', { method: 'POST', body: input }),
    split: (id: string, ways: number) =>
      request<BillSplitDTO>(`/api/orders/${id}/split`, {
        query: { ways },
      }),
  },

  payments: {
    // All payments for the tenant — the operational dashboard joins these to
    // orders to show each bill's payment status.
    list: () => request<PaymentListDTO>('/api/payments'),
    // Payments recorded against an order — the UI reads these to reflect the
    // current, webhook-confirmed state of the bill (pending → paid / declined).
    listForOrder: (orderId: string) =>
      request<PaymentListDTO>(`/api/orders/${orderId}/payments`),
    // Initiate a charge through the mock provider; returns a pending payment.
    charge: (orderId: string, input: ChargeBillDTO = {}) =>
      request<PaymentDTO>(`/api/orders/${orderId}/charge`, {
        method: 'POST',
        body: input,
      }),
    // Simulate the mock provider's asynchronous webhook callback that settles
    // the charge. In production this call comes from the provider, not the UI;
    // for the mock provider the client drives it (see the webhook route note).
    settle: (input: {
      eventId: string;
      type: 'payment.succeeded' | 'payment.failed';
      externalRef: string;
    }) =>
      request<PaymentWebhookResultDTO>('/api/webhooks/payments', {
        method: 'POST',
        body: {
          id: input.eventId,
          type: input.type,
          data: { externalRef: input.externalRef },
        },
      }),
  },

  // Unauthenticated, customer-facing booking flow. The restaurant is always
  // named in the URL rather than derived from a session.
  public: {
    listRestaurants: () =>
      request<RestaurantListDTO>('/api/public/restaurants'),
    getRestaurant: (restaurantId: string) =>
      request<RestaurantDTO>(`/api/public/restaurants/${restaurantId}`),
    availability: (restaurantId: string, query: GetAvailabilityDTO) =>
      request<AvailabilityDTO>(
        `/api/public/restaurants/${restaurantId}/availability`,
        { query: { date: query.date, partySize: query.partySize } }
      ),
    reserve: (restaurantId: string, input: CreateReservationDTO) =>
      request<ReservationDTO>(
        `/api/public/restaurants/${restaurantId}/reservations`,
        { method: 'POST', body: input }
      ),
  },
};

export type Api = typeof api;
