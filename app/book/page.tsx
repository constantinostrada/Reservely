'use client';

import Link from 'next/link';
import { api } from '@interfaces/web/api/client';
import { useApiQuery } from '@interfaces/web/hooks/useApiQuery';
import styles from '@interfaces/web/features/booking/booking.module.css';

/**
 * Public restaurant directory — the entry point of the guest booking flow.
 * Pick a restaurant to see its availability and book a table.
 */
export default function BookDirectoryPage(): JSX.Element {
  const restaurantsQuery = useApiQuery(() => api.public.listRestaurants(), []);

  return (
    <div>
      <div className={styles.hero}>
        <h1 className={styles.title}>Find a table</h1>
        <p className={styles.subtitle}>
          Choose a restaurant to see availability and book.
        </p>
      </div>

      {restaurantsQuery.isLoading && (
        <p className={styles.stateMessage}>Loading restaurants…</p>
      )}

      {restaurantsQuery.error && (
        <div className={styles.errorBox} role="alert">
          Could not load restaurants: {restaurantsQuery.error.message}{' '}
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={restaurantsQuery.refetch}
          >
            Retry
          </button>
        </div>
      )}

      {restaurantsQuery.data && restaurantsQuery.data.total === 0 && (
        <div className={styles.empty}>
          No restaurants are taking bookings yet.
        </div>
      )}

      {restaurantsQuery.data && restaurantsQuery.data.total > 0 && (
        <div className={styles.grid}>
          {restaurantsQuery.data.restaurants.map((restaurant) => (
            <Link
              key={restaurant.id}
              href={`/book/${restaurant.id}`}
              className={styles.restaurantCard}
            >
              <div className={styles.restaurantName}>{restaurant.name}</div>
              <div className={styles.restaurantMeta}>
                {restaurant.address && (
                  <>
                    {restaurant.address}
                    <br />
                  </>
                )}
                {restaurant.phone && <>{restaurant.phone}</>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
