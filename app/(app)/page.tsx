'use client';

import { api } from '@interfaces/web/api/client';
import { useApiQuery } from '@interfaces/web/hooks/useApiQuery';
import { useAuth } from '@interfaces/web/auth/AuthProvider';
import styles from './dashboard.module.css';

export default function DashboardPage(): JSX.Element {
  const { user } = useAuth();
  const restaurantsQuery = useApiQuery(() => api.restaurants.list(), []);
  const restaurant = restaurantsQuery.data?.restaurants[0];

  return (
    <div>
      <h1 className={styles.heading}>Welcome back, {user.name}</h1>
      <p className={styles.subheading}>
        Here is an overview of your restaurant.
      </p>

      {restaurantsQuery.isLoading && (
        <p className={styles.stateMessage}>Loading restaurant…</p>
      )}

      {restaurantsQuery.error && (
        <div className={styles.errorBox} role="alert">
          <p>Could not load your restaurant: {restaurantsQuery.error.message}</p>
          <button
            type="button"
            className={styles.retryButton}
            onClick={restaurantsQuery.refetch}
          >
            Retry
          </button>
        </div>
      )}

      {restaurant && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{restaurant.name}</h2>
          <dl className={styles.detailList}>
            <div className={styles.detailRow}>
              <dt>Time zone</dt>
              <dd>{restaurant.timezone}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Currency</dt>
              <dd>{restaurant.currency}</dd>
            </div>
            {restaurant.address && (
              <div className={styles.detailRow}>
                <dt>Address</dt>
                <dd>{restaurant.address}</dd>
              </div>
            )}
            {restaurant.phone && (
              <div className={styles.detailRow}>
                <dt>Phone</dt>
                <dd>{restaurant.phone}</dd>
              </div>
            )}
          </dl>
        </section>
      )}
    </div>
  );
}
