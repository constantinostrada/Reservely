'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { OrderDTO } from '@application/dtos/OrderDTO';
import type { PaymentDTO } from '@application/dtos/PaymentDTO';
import type { ReservationDTO } from '@application/dtos/ReservationDTO';
import { api } from '../../api/client';
import { useApiQuery } from '../../hooks/useApiQuery';
import { formatMoney } from '../orders/money';
import ui from '../../components/ui.module.css';
import styles from './operations.module.css';

type PayState = 'paid' | 'processing' | 'declined' | 'unpaid';

const PAY_LABEL: Record<PayState, string> = {
  paid: 'Paid',
  processing: 'Processing',
  declined: 'Declined',
  unpaid: 'Unpaid',
};

const PAY_CLASS: Record<PayState, string> = {
  paid: styles.payPaid,
  processing: styles.payProcessing,
  declined: styles.payDeclined,
  unpaid: styles.payUnpaid,
};

/**
 * The day-to-day operations view: the reservations for a chosen date with each
 * reservation's orders and their payment status. One date filter drives the
 * whole board. Reads reservations, orders, and payments once through the shared
 * API client and joins them client-side.
 */
export function OperationsDashboard(): JSX.Element {
  const restaurantQuery = useApiQuery(() => api.restaurants.list(), []);
  const reservationsQuery = useApiQuery(() => api.reservations.list(), []);
  const ordersQuery = useApiQuery(() => api.orders.list(), []);
  const paymentsQuery = useApiQuery(() => api.payments.list(), []);

  const restaurant = restaurantQuery.data?.restaurants[0];
  const timezone = restaurant?.timezone ?? 'UTC';
  const currency = restaurant?.currency ?? 'USD';

  const coreError =
    reservationsQuery.error || ordersQuery.error || paymentsQuery.error;
  const coreLoading =
    reservationsQuery.isLoading ||
    ordersQuery.isLoading ||
    paymentsQuery.isLoading ||
    restaurantQuery.isLoading;

  const retryAll = (): void => {
    reservationsQuery.refetch();
    ordersQuery.refetch();
    paymentsQuery.refetch();
  };

  return (
    <div>
      <div className={ui.pageHeader}>
        <div>
          <h1 className={ui.pageTitle}>Operations</h1>
          <p className={ui.pageSubtitle}>
            Upcoming reservations with their orders and payment status.
          </p>
        </div>
      </div>

      {coreLoading && <p className={ui.stateMessage}>Loading dashboard…</p>}

      {coreError && (
        <div className={ui.errorBox} role="alert">
          Could not load the dashboard: {coreError.message}
          <div className={ui.actions} style={{ marginTop: '0.5rem' }}>
            <button type="button" className={ui.rowButton} onClick={retryAll}>
              Retry
            </button>
          </div>
        </div>
      )}

      {!coreLoading && !coreError && restaurant && (
        <Board
          reservations={reservationsQuery.data?.reservations ?? []}
          orders={ordersQuery.data?.orders ?? []}
          payments={paymentsQuery.data?.payments ?? []}
          timezone={timezone}
          currency={currency}
        />
      )}
    </div>
  );
}

function Board({
  reservations,
  orders,
  payments,
  timezone,
  currency,
}: {
  reservations: ReservationDTO[];
  orders: OrderDTO[];
  payments: PaymentDTO[];
  timezone: string;
  currency: string;
}): JSX.Element {
  // Default to today in the restaurant's own time zone (mounts only once the
  // restaurant — and therefore its time zone — is loaded).
  const [selectedDate, setSelectedDate] = useState(() =>
    localDateKey(new Date(), timezone)
  );

  const ordersByReservation = useMemo(() => {
    const map = new Map<string, OrderDTO[]>();
    for (const order of orders) {
      if (!order.reservationId) {
        continue;
      }
      const list = map.get(order.reservationId) ?? [];
      list.push(order);
      map.set(order.reservationId, list);
    }
    return map;
  }, [orders]);

  const payStateByOrder = useMemo(() => {
    const map = new Map<string, PayState>();
    const byOrder = new Map<string, PaymentDTO[]>();
    for (const payment of payments) {
      const list = byOrder.get(payment.orderId) ?? [];
      list.push(payment);
      byOrder.set(payment.orderId, list);
    }
    for (const order of orders) {
      map.set(order.id, payStateFor(byOrder.get(order.id) ?? []));
    }
    return map;
  }, [orders, payments]);

  const dayReservations = useMemo(
    () =>
      reservations
        .filter((r) => localDateKey(new Date(r.startsAt), timezone) === selectedDate)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [reservations, timezone, selectedDate]
  );

  const summary = useMemo(() => {
    let orderCount = 0;
    let billedCents = 0;
    let paidCents = 0;
    for (const reservation of dayReservations) {
      for (const order of ordersByReservation.get(reservation.id) ?? []) {
        orderCount += 1;
        billedCents += order.totalCents;
        if (payStateByOrder.get(order.id) === 'paid') {
          paidCents += order.totalCents;
        }
      }
    }
    return { orderCount, billedCents, paidCents };
  }, [dayReservations, ordersByReservation, payStateByOrder]);

  const shiftDay = (delta: number): void => {
    setSelectedDate((current) => addDays(current, delta));
  };

  return (
    <>
      <div className={styles.filterBar}>
        <div className={ui.field} style={{ marginBottom: 0 }}>
          <label className={ui.label} htmlFor="dashboard-date">
            Date
          </label>
          <div className={styles.dateNav}>
            <button
              type="button"
              className={ui.rowButton}
              onClick={() => shiftDay(-1)}
              aria-label="Previous day"
            >
              ‹
            </button>
            <input
              id="dashboard-date"
              className={ui.input}
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <button
              type="button"
              className={ui.rowButton}
              onClick={() => shiftDay(1)}
              aria-label="Next day"
            >
              ›
            </button>
          </div>
        </div>
        <button
          type="button"
          className={ui.secondaryButton}
          onClick={() => setSelectedDate(localDateKey(new Date(), timezone))}
        >
          Today
        </button>
      </div>

      <div className={styles.summary}>
        <Tile label="Reservations" value={String(dayReservations.length)} />
        <Tile label="Orders" value={String(summary.orderCount)} />
        <Tile label="Billed" value={formatMoney(summary.billedCents, currency)} />
        <Tile label="Collected" value={formatMoney(summary.paidCents, currency)} />
      </div>

      {dayReservations.length === 0 ? (
        <div className={ui.empty}>
          No reservations on {formatDateHeading(selectedDate)}.
        </div>
      ) : (
        dayReservations.map((reservation) => (
          <ReservationRow
            key={reservation.id}
            reservation={reservation}
            orders={ordersByReservation.get(reservation.id) ?? []}
            payStateByOrder={payStateByOrder}
            timezone={timezone}
            currency={currency}
          />
        ))
      )}
    </>
  );
}

function ReservationRow({
  reservation,
  orders,
  payStateByOrder,
  timezone,
  currency,
}: {
  reservation: ReservationDTO;
  orders: OrderDTO[];
  payStateByOrder: Map<string, PayState>;
  timezone: string;
  currency: string;
}): JSX.Element {
  return (
    <section className={styles.resCard}>
      <div className={styles.resHeader}>
        <div>
          <span className={styles.resTime}>
            {formatTime(reservation.startsAt, timezone)}
          </span>{' '}
          <span className={styles.resGuest}>{reservation.guestName}</span>
          <div className={styles.resMeta}>
            Party of {reservation.partySize}
          </div>
        </div>
        <span className={ui.badge}>{reservation.status}</span>
      </div>

      {orders.length === 0 ? (
        <p className={styles.noOrders}>No orders yet.</p>
      ) : (
        <div className={styles.orderList}>
          {orders.map((order) => {
            const state = payStateByOrder.get(order.id) ?? 'unpaid';
            return (
              <div key={order.id} className={styles.orderRow}>
                <div className={styles.orderInfo}>
                  <span className={styles.orderId}>
                    #{order.id.slice(-6)}
                  </span>{' '}
                  · {order.items.length}{' '}
                  {order.items.length === 1 ? 'item' : 'items'} · {order.status}
                </div>
                <div className={styles.orderRight}>
                  <span className={styles.orderTotal}>
                    {formatMoney(order.totalCents, currency)}
                  </span>
                  <span className={PAY_CLASS[state]}>{PAY_LABEL[state]}</span>
                  <Link
                    href={`/orders/${order.id}/checkout`}
                    className={ui.rowButton}
                  >
                    {state === 'paid' ? 'View' : 'Checkout'}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Tile({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className={styles.tile}>
      <div className={styles.tileLabel}>{label}</div>
      <div className={styles.tileValue}>{value}</div>
    </div>
  );
}

/** A bill's payment state: a succeeded payment wins, then pending, then failed. */
function payStateFor(orderPayments: PaymentDTO[]): PayState {
  if (orderPayments.some((p) => p.status === 'succeeded')) {
    return 'paid';
  }
  if (orderPayments.some((p) => p.status === 'pending')) {
    return 'processing';
  }
  if (orderPayments.some((p) => p.status === 'failed')) {
    return 'declined';
  }
  return 'unpaid';
}

/** Calendar date (YYYY-MM-DD) of an instant in the given time zone. */
function localDateKey(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Add days to a YYYY-MM-DD string without time-zone drift (UTC math). */
function addDays(dateKey: string, delta: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const base = new Date(Date.UTC(year, month - 1, day));
  base.setUTCDate(base.getUTCDate() + delta);
  return base.toISOString().slice(0, 10);
}

function formatTime(isoInstant: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoInstant));
}

function formatDateHeading(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
