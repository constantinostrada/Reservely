'use client';

import Link from 'next/link';
import { api } from '@interfaces/web/api/client';
import { useApiQuery } from '@interfaces/web/hooks/useApiQuery';
import styles from '@interfaces/web/components/ui.module.css';

/**
 * Reservations list — the entry point for ordering. Each row links to the
 * reservation's ordering + bill-split screen.
 */
export default function ReservationsPage(): JSX.Element {
  const reservationsQuery = useApiQuery(() => api.reservations.list(), []);
  const restaurantQuery = useApiQuery(() => api.restaurants.list(), []);
  const timezone =
    restaurantQuery.data?.restaurants[0]?.timezone ?? 'UTC';

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Reservations</h1>
          <p className={styles.pageSubtitle}>
            Select a reservation to take an order and split the bill.
          </p>
        </div>
      </div>

      {reservationsQuery.isLoading && (
        <p className={styles.stateMessage}>Loading reservations…</p>
      )}

      {reservationsQuery.error && (
        <div className={styles.errorBox} role="alert">
          Could not load reservations: {reservationsQuery.error.message}{' '}
          <button
            type="button"
            className={styles.rowButton}
            onClick={reservationsQuery.refetch}
          >
            Retry
          </button>
        </div>
      )}

      {reservationsQuery.data && reservationsQuery.data.total === 0 && (
        <div className={styles.empty}>No reservations yet.</div>
      )}

      {reservationsQuery.data && reservationsQuery.data.total > 0 && (
        <table className={styles.listTable}>
          <thead>
            <tr>
              <th>Guest</th>
              <th>When</th>
              <th>Party</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {reservationsQuery.data.reservations.map((reservation) => (
              <tr key={reservation.id}>
                <td>{reservation.guestName}</td>
                <td>{formatWhen(reservation.startsAt, timezone)}</td>
                <td>{reservation.partySize}</td>
                <td>
                  <span className={styles.badge}>{reservation.status}</span>
                </td>
                <td>
                  <Link
                    href={`/reservations/${reservation.id}`}
                    className={styles.rowButton}
                  >
                    Order &amp; split
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function formatWhen(isoInstant: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoInstant));
}
