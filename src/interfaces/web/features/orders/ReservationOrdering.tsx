'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { MenuItemDTO } from '@application/dtos/MenuItemDTO';
import type { OrderDTO } from '@application/dtos/OrderDTO';
import { api } from '../../api/client';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useApiMutation } from '../../hooks/useApiMutation';
import { FormErrorMessage } from '../../components/FormErrorMessage';
import { formatMoney, parseMoneyToCents } from './money';
import ui from '../../components/ui.module.css';
import styles from './orders.module.css';

/** Reservation statuses that may still accrue orders (see PlaceOrderUseCase). */
const ORDERABLE_STATUSES = new Set(['pending', 'confirmed', 'seated']);

/**
 * The operator's ordering + bill-split screen for a single reservation:
 * browse the menu, place an order against the reservation, then view each
 * order's bill split. Every amount arrives as integer cents and is formatted
 * to the restaurant's currency here, the only place money becomes a string.
 */
export function ReservationOrdering({
  reservationId,
}: {
  reservationId: string;
}): JSX.Element {
  const restaurantQuery = useApiQuery(() => api.restaurants.list(), []);
  const reservationQuery = useApiQuery(
    () => api.reservations.get(reservationId),
    [reservationId]
  );
  const menuQuery = useApiQuery(() => api.menuItems.list(), []);
  const ordersQuery = useApiQuery(
    () => api.orders.list(reservationId),
    [reservationId]
  );

  const placeOrder = useApiMutation(api.orders.place);

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [tip, setTip] = useState('');

  const currency = restaurantQuery.data?.restaurants[0]?.currency ?? 'USD';
  const timezone =
    restaurantQuery.data?.restaurants[0]?.timezone ?? 'UTC';
  const reservation = reservationQuery.data;
  const canOrder = reservation
    ? ORDERABLE_STATUSES.has(reservation.status)
    : false;

  const availableItems = useMemo(
    () => (menuQuery.data?.menuItems ?? []).filter((m) => m.isAvailable),
    [menuQuery.data]
  );

  const categories = useMemo(() => groupByCategory(availableItems), [
    availableItems,
  ]);

  const setQty = (id: string, next: number): void => {
    setQuantities((prev) => {
      const clamped = Math.max(0, Math.min(100, next));
      if (clamped === 0) {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: clamped };
    });
  };

  const selectedItems = availableItems
    .filter((m) => (quantities[m.id] ?? 0) > 0)
    .map((m) => ({ item: m, quantity: quantities[m.id] }));

  const draftSubtotalCents = selectedItems.reduce(
    (sum, { item, quantity }) => sum + item.priceCents * quantity,
    0
  );
  const tipCents = parseMoneyToCents(tip);

  const handlePlaceOrder = async (): Promise<void> => {
    if (selectedItems.length === 0) {
      return;
    }
    const result = await placeOrder.mutate({
      reservationId,
      items: selectedItems.map(({ item, quantity }) => ({
        menuItemId: item.id,
        quantity,
      })),
      tipCents: tipCents > 0 ? tipCents : undefined,
    });
    if (result) {
      setQuantities({});
      setTip('');
      ordersQuery.refetch();
    }
  };

  return (
    <div>
      <Link href="/reservations" className={ui.rowButton}>
        ← All reservations
      </Link>

      <div className={ui.pageHeader} style={{ marginTop: '1rem' }}>
        <div>
          <h1 className={ui.pageTitle}>
            {reservation ? reservation.guestName : 'Reservation'}
          </h1>
          {reservation && (
            <p className={ui.pageSubtitle}>
              {formatReservationTime(reservation.startsAt, timezone)} ·{' '}
              {reservation.partySize}{' '}
              {reservation.partySize === 1 ? 'guest' : 'guests'} ·{' '}
              <span className={ui.badge}>{reservation.status}</span>
            </p>
          )}
        </div>
      </div>

      {(reservationQuery.isLoading ||
        menuQuery.isLoading ||
        ordersQuery.isLoading) && (
        <p className={ui.stateMessage}>Loading…</p>
      )}

      {reservationQuery.error && (
        <div className={ui.errorBox} role="alert">
          Could not load reservation: {reservationQuery.error.message}
        </div>
      )}

      {/* New order */}
      {reservation && (
        <section className={ui.card}>
          <h2 className={ui.cardTitle}>New order</h2>

          {!canOrder && (
            <p className={ui.stateMessage}>
              Orders can only be placed against pending, confirmed, or seated
              reservations. This reservation is {reservation.status}.
            </p>
          )}

          {canOrder && menuQuery.error && (
            <div className={ui.errorBox} role="alert">
              Could not load the menu: {menuQuery.error.message}
            </div>
          )}

          {canOrder && menuQuery.data && availableItems.length === 0 && (
            <p className={ui.stateMessage}>No menu items are available.</p>
          )}

          {canOrder &&
            categories.map(([category, items]) => (
              <div key={category}>
                <div className={styles.menuCategory}>{category}</div>
                {items.map((item) => (
                  <div key={item.id} className={styles.menuRow}>
                    <div className={styles.menuInfo}>
                      <div className={styles.menuName}>{item.name}</div>
                      {item.description && (
                        <div className={styles.menuDesc}>
                          {item.description}
                        </div>
                      )}
                    </div>
                    <div className={styles.menuPrice}>
                      {formatMoney(item.priceCents, currency)}
                    </div>
                    <Stepper
                      value={quantities[item.id] ?? 0}
                      onChange={(next) => setQty(item.id, next)}
                    />
                  </div>
                ))}
              </div>
            ))}

          {canOrder && selectedItems.length > 0 && (
            <div className={styles.totals}>
              <div className={styles.totalRow}>
                <span>Subtotal ({selectedItems.length} items)</span>
                <span>{formatMoney(draftSubtotalCents, currency)}</span>
              </div>
              <div className={ui.field} style={{ marginTop: '0.75rem' }}>
                <label className={ui.label} htmlFor="order-tip">
                  Tip ({currency})
                </label>
                <input
                  id="order-tip"
                  className={ui.input}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={tip}
                  onChange={(e) => setTip(e.target.value)}
                  style={{ maxWidth: '160px' }}
                />
              </div>
              <p className={ui.hint}>
                Tax is calculated automatically when the order is placed.
              </p>

              {placeOrder.error && (
                <FormErrorMessage error={placeOrder.error} />
              )}

              <div className={ui.actions} style={{ marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className={ui.primaryButton}
                  onClick={handlePlaceOrder}
                  disabled={placeOrder.isPending}
                >
                  {placeOrder.isPending ? 'Placing…' : 'Place order'}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Existing orders + bill split */}
      <h2 className={ui.cardTitle} style={{ marginTop: '0.5rem' }}>
        Orders
      </h2>
      {ordersQuery.error && (
        <div className={ui.errorBox} role="alert">
          Could not load orders: {ordersQuery.error.message}
        </div>
      )}
      {ordersQuery.data && ordersQuery.data.total === 0 && (
        <div className={ui.empty}>
          No orders yet for this reservation. Build one above.
        </div>
      )}
      {ordersQuery.data?.orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          currency={currency}
          defaultWays={Math.max(1, reservation?.partySize ?? 1)}
        />
      ))}
    </div>
  );
}

function Stepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}): JSX.Element {
  return (
    <div className={styles.stepper}>
      <button
        type="button"
        className={styles.stepButton}
        onClick={() => onChange(value - 1)}
        disabled={value === 0}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className={styles.stepCount}>{value}</span>
      <button
        type="button"
        className={styles.stepButton}
        onClick={() => onChange(value + 1)}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

function OrderCard({
  order,
  currency,
  defaultWays,
}: {
  order: OrderDTO;
  currency: string;
  defaultWays: number;
}): JSX.Element {
  const [ways, setWays] = useState(defaultWays);
  const splitQuery = useApiQuery(
    () => api.orders.split(order.id, ways),
    [order.id, ways]
  );

  const split = splitQuery.data;
  const sharesSum = split
    ? split.shareCents.reduce((a, b) => a + b, 0)
    : 0;
  const sumsToTotal = split ? sharesSum === split.totalCents : true;

  return (
    <section className={ui.card}>
      <div className={ui.pageHeader} style={{ marginBottom: '0.5rem' }}>
        <p className={styles.orderMeta} style={{ marginBottom: 0 }}>
          Order #{order.id.slice(-6)} · {order.status}
        </p>
        <Link href={`/orders/${order.id}/checkout`} className={ui.rowButton}>
          Pay bill →
        </Link>
      </div>

      <table className={ui.listTable} style={{ marginBottom: '0.5rem' }}>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Line</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>{item.itemName}</td>
              <td>{item.quantity}</td>
              <td>{formatMoney(item.unitPriceCents, currency)}</td>
              <td>{formatMoney(item.lineTotalCents, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.totals}>
        <div className={styles.totalRow}>
          <span>Subtotal</span>
          <span>{formatMoney(order.subtotalCents, currency)}</span>
        </div>
        <div className={styles.totalRow}>
          <span>Tax</span>
          <span>{formatMoney(order.taxCents, currency)}</span>
        </div>
        <div className={styles.totalRow}>
          <span>Tip</span>
          <span>{formatMoney(order.tipCents, currency)}</span>
        </div>
        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
          <span>Total</span>
          <span>{formatMoney(order.totalCents, currency)}</span>
        </div>
      </div>

      {/* Bill split */}
      <h3 className={ui.cardTitle} style={{ marginTop: '1.25rem' }}>
        Split the bill
      </h3>
      <div className={styles.splitControls}>
        <div className={ui.field} style={{ marginBottom: 0 }}>
          <label className={ui.label} htmlFor={`ways-${order.id}`}>
            Split between
          </label>
          <input
            id={`ways-${order.id}`}
            className={ui.input}
            type="number"
            min={1}
            max={50}
            value={ways}
            onChange={(e) => {
              const next = Number.parseInt(e.target.value, 10);
              setWays(Number.isFinite(next) ? Math.min(50, Math.max(1, next)) : 1);
            }}
            style={{ maxWidth: '110px' }}
          />
        </div>
      </div>

      {splitQuery.isLoading && (
        <p className={ui.stateMessage}>Calculating split…</p>
      )}
      {splitQuery.error && (
        <div className={ui.errorBox} role="alert">
          Could not calculate the split: {splitQuery.error.message}
        </div>
      )}
      {split && (
        <>
          <div className={styles.shareList}>
            {split.shareCents.map((share, index) => (
              <div
                key={index}
                className={styles.shareCard}
              >
                <div className={styles.shareLabel}>Diner {index + 1}</div>
                <div className={styles.shareAmount}>
                  {formatMoney(share, currency)}
                </div>
              </div>
            ))}
          </div>
          <p className={sumsToTotal ? styles.sumCheck : styles.sumCheckBad}>
            {sumsToTotal ? '✓' : '✗'} Shares sum to{' '}
            {formatMoney(sharesSum, currency)} of{' '}
            {formatMoney(split.totalCents, currency)} total
          </p>
        </>
      )}
    </section>
  );
}

function groupByCategory(items: MenuItemDTO[]): [string, MenuItemDTO[]][] {
  const map = new Map<string, MenuItemDTO[]>();
  for (const item of items) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function formatReservationTime(isoInstant: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoInstant));
}
