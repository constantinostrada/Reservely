'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { OrderDTO } from '@application/dtos/OrderDTO';
import type { PaymentDTO } from '@application/dtos/PaymentDTO';
import { api } from '../../api/client';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useApiMutation } from '../../hooks/useApiMutation';
import { FormErrorMessage } from '../../components/FormErrorMessage';
import { formatMoney } from '../orders/money';
import ui from '../../components/ui.module.css';
import orders from '../orders/orders.module.css';
import styles from './checkout.module.css';

type PaymentMethod = 'card' | 'cash' | 'online';
const METHODS: PaymentMethod[] = ['card', 'cash', 'online'];

/**
 * Checkout + confirmation for a single order's bill. Pays through the mock
 * provider (a charge that settles via webhook) and reflects the eventual
 * webhook-confirmed 'paid' state read back from the server. The provider is
 * mocked, so the client drives the settling webhook itself (in production the
 * provider calls it).
 */
export function Checkout({ orderId }: { orderId: string }): JSX.Element {
  const restaurantQuery = useApiQuery(() => api.restaurants.list(), []);
  const orderQuery = useApiQuery(() => api.orders.get(orderId), [orderId]);
  const paymentsQuery = useApiQuery(
    () => api.payments.listForOrder(orderId),
    [orderId]
  );

  const [method, setMethod] = useState<PaymentMethod>('card');
  const [runningOutcome, setRunningOutcome] = useState<
    'succeeded' | 'failed' | null
  >(null);

  // The checkout is one composite step: charge the bill, then let the mock
  // provider settle it. Errors from either call surface via `pay.error`.
  const pay = useApiMutation(
    async (input: { method: PaymentMethod; outcome: 'succeeded' | 'failed' }) => {
      const payment = await api.payments.charge(orderId, {
        method: input.method,
      });
      if (!payment.externalRef) {
        throw new Error('The provider did not return a charge reference.');
      }
      return api.payments.settle({
        eventId: crypto.randomUUID(),
        type:
          input.outcome === 'succeeded'
            ? 'payment.succeeded'
            : 'payment.failed',
        externalRef: payment.externalRef,
      });
    }
  );

  const currency = restaurantQuery.data?.restaurants[0]?.currency ?? 'USD';
  const order = orderQuery.data;
  const payments = paymentsQuery.data?.payments ?? [];
  const succeeded = payments.find((p) => p.status === 'succeeded');
  const pending = payments.find((p) => p.status === 'pending');
  // Most recent failed attempt (payments come back oldest-first).
  const lastFailed = [...payments].reverse().find((p) => p.status === 'failed');

  const runPay = async (outcome: 'succeeded' | 'failed'): Promise<void> => {
    setRunningOutcome(outcome);
    const result = await pay.mutate({ method, outcome });
    setRunningOutcome(null);
    if (result) {
      // Reflect the settled state read back from the server, not the local
      // response — the UI always mirrors what the webhook persisted.
      paymentsQuery.refetch();
    }
  };

  const backHref = order?.reservationId
    ? `/reservations/${order.reservationId}`
    : '/reservations';

  return (
    <div>
      <Link href={backHref} className={ui.rowButton}>
        ← Back to reservation
      </Link>

      <div className={ui.pageHeader} style={{ marginTop: '1rem' }}>
        <div>
          <h1 className={ui.pageTitle}>Checkout</h1>
          {order && (
            <p className={ui.pageSubtitle}>Order #{order.id.slice(-6)}</p>
          )}
        </div>
      </div>

      {(orderQuery.isLoading || paymentsQuery.isLoading) && (
        <p className={ui.stateMessage}>Loading…</p>
      )}

      {orderQuery.error && (
        <div className={ui.errorBox} role="alert">
          Could not load the order: {orderQuery.error.message}
          <div className={ui.actions} style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              className={ui.rowButton}
              onClick={() => orderQuery.refetch()}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {paymentsQuery.error && (
        <div className={ui.errorBox} role="alert">
          Could not load payment status: {paymentsQuery.error.message}
          <div className={ui.actions} style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              className={ui.rowButton}
              onClick={() => paymentsQuery.refetch()}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {order && succeeded ? (
        <Confirmation
          order={order}
          payment={succeeded}
          currency={currency}
          backHref={backHref}
        />
      ) : (
        order && (
          <section className={ui.card}>
            <h2 className={ui.cardTitle}>Bill</h2>
            <BillSummary order={order} currency={currency} />

            {pending && (
              <div className={styles.processing} role="status">
                <span>Payment is processing…</span>
                <button
                  type="button"
                  className={ui.rowButton}
                  onClick={() => paymentsQuery.refetch()}
                >
                  Check status
                </button>
              </div>
            )}

            {lastFailed && !pending && (
              <div className={ui.errorBox} role="alert">
                The last payment attempt was declined. You can try again.
              </div>
            )}

            {pay.error && <FormErrorMessage error={pay.error} />}

            {!pending && (
              <>
                <div
                  className={ui.field}
                  style={{ marginBottom: '0.5rem', marginTop: '1rem' }}
                >
                  <span className={ui.label}>Payment method</span>
                  <div className={styles.methodGroup}>
                    {METHODS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={
                          method === m
                            ? styles.methodChipActive
                            : styles.methodChip
                        }
                        aria-pressed={method === m}
                        disabled={pay.isPending}
                        onClick={() => setMethod(m)}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={ui.actions}>
                  <button
                    type="button"
                    className={ui.primaryButton}
                    disabled={pay.isPending}
                    onClick={() => runPay('succeeded')}
                  >
                    {pay.isPending && runningOutcome === 'succeeded'
                      ? 'Processing…'
                      : `Pay ${formatMoney(order.totalCents, currency)}`}
                  </button>
                </div>

                <div className={styles.mockRow}>
                  <p className={ui.hint} style={{ marginBottom: '0.4rem' }}>
                    Mock provider — payments are simulated, no real card is
                    charged.
                  </p>
                  <button
                    type="button"
                    className={styles.linkButton}
                    disabled={pay.isPending}
                    onClick={() => runPay('failed')}
                  >
                    {pay.isPending && runningOutcome === 'failed'
                      ? 'Simulating…'
                      : 'Simulate a declined payment'}
                  </button>
                </div>
              </>
            )}
          </section>
        )
      )}
    </div>
  );
}

function BillSummary({
  order,
  currency,
}: {
  order: OrderDTO;
  currency: string;
}): JSX.Element {
  return (
    <div className={orders.totals} style={{ marginTop: 0, borderTop: 'none' }}>
      <div className={orders.totalRow}>
        <span>Subtotal</span>
        <span>{formatMoney(order.subtotalCents, currency)}</span>
      </div>
      <div className={orders.totalRow}>
        <span>Tax</span>
        <span>{formatMoney(order.taxCents, currency)}</span>
      </div>
      <div className={orders.totalRow}>
        <span>Tip</span>
        <span>{formatMoney(order.tipCents, currency)}</span>
      </div>
      <div className={`${orders.totalRow} ${orders.grandTotal}`}>
        <span>Total</span>
        <span>{formatMoney(order.totalCents, currency)}</span>
      </div>
    </div>
  );
}

function Confirmation({
  order,
  payment,
  currency,
  backHref,
}: {
  order: OrderDTO;
  payment: PaymentDTO;
  currency: string;
  backHref: string;
}): JSX.Element {
  return (
    <section className={`${ui.card} ${styles.confirmCard}`}>
      <div className={styles.confirmIcon} aria-hidden="true">
        ✓
      </div>
      <h2 className={styles.confirmTitle}>Payment confirmed</h2>
      <p className={styles.confirmSubtitle}>
        The bill has been paid and settled.
      </p>
      <div className={styles.confirmAmount}>
        {formatMoney(payment.amountCents, currency)}
      </div>

      <div className={styles.detailList}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Status</span>
          <span className={styles.detailValue}>
            <span className={ui.badge}>Paid</span>
          </span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Method</span>
          <span
            className={styles.detailValue}
            style={{ textTransform: 'capitalize' }}
          >
            {payment.method}
          </span>
        </div>
        {payment.tipCents > 0 && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Includes tip</span>
            <span className={styles.detailValue}>
              {formatMoney(payment.tipCents, currency)}
            </span>
          </div>
        )}
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Order</span>
          <span className={styles.detailValue}>#{order.id.slice(-6)}</span>
        </div>
        {payment.processedAt && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Paid at</span>
            <span className={styles.detailValue}>
              {formatDateTime(payment.processedAt)}
            </span>
          </div>
        )}
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Reference</span>
          <span className={styles.detailValue}>{payment.externalRef}</span>
        </div>
      </div>

      <Link href={backHref} className={ui.primaryButton}>
        Back to reservation
      </Link>
    </section>
  );
}

function formatDateTime(isoInstant: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(isoInstant));
}
