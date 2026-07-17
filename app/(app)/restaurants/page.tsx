'use client';

import { useState } from 'react';
import type { RestaurantDTO } from '@application/dtos/RestaurantDTO';
import { api } from '@interfaces/web/api/client';
import { useApiQuery } from '@interfaces/web/hooks/useApiQuery';
import { RestaurantForm } from '@interfaces/web/features/restaurants/RestaurantForm';
import styles from '@interfaces/web/components/ui.module.css';

export default function RestaurantsPage(): JSX.Element {
  const restaurantsQuery = useApiQuery(() => api.restaurants.list(), []);
  const [editing, setEditing] = useState<RestaurantDTO | null>(null);
  const [creating, setCreating] = useState(false);

  const handleSaved = (): void => {
    setEditing(null);
    setCreating(false);
    restaurantsQuery.refetch();
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Restaurants</h1>
          <p className={styles.pageSubtitle}>
            Manage your restaurant&apos;s details.
          </p>
        </div>
        {!creating && !editing && (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => setCreating(true)}
          >
            New restaurant
          </button>
        )}
      </div>

      {creating && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>New restaurant</h2>
          <p className={styles.pageSubtitle} style={{ marginBottom: '1rem' }}>
            Creating a restaurant starts a new, separate workspace.
          </p>
          <RestaurantForm
            onSaved={handleSaved}
            onCancel={() => setCreating(false)}
          />
        </section>
      )}

      {editing && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Edit {editing.name}</h2>
          <RestaurantForm
            restaurant={editing}
            onSaved={handleSaved}
            onCancel={() => setEditing(null)}
          />
        </section>
      )}

      {restaurantsQuery.isLoading && (
        <p className={styles.stateMessage}>Loading restaurants…</p>
      )}

      {restaurantsQuery.error && (
        <div className={styles.errorBox} role="alert">
          Could not load restaurants: {restaurantsQuery.error.message}{' '}
          <button
            type="button"
            className={styles.rowButton}
            onClick={restaurantsQuery.refetch}
          >
            Retry
          </button>
        </div>
      )}

      {restaurantsQuery.data && (
        <table className={styles.listTable}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Time zone</th>
              <th>Currency</th>
              <th>Address</th>
              <th>Phone</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {restaurantsQuery.data.restaurants.map((restaurant) => (
              <tr key={restaurant.id}>
                <td>{restaurant.name}</td>
                <td>
                  <code>{restaurant.slug}</code>
                </td>
                <td>{restaurant.timezone}</td>
                <td>{restaurant.currency}</td>
                <td>{restaurant.address ?? '—'}</td>
                <td>{restaurant.phone ?? '—'}</td>
                <td>
                  <button
                    type="button"
                    className={styles.rowButton}
                    onClick={() => {
                      setCreating(false);
                      setEditing(restaurant);
                    }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
