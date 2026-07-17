'use client';

import { useState } from 'react';
import type { TableDTO } from '@application/dtos/TableDTO';
import { api } from '@interfaces/web/api/client';
import { useApiQuery } from '@interfaces/web/hooks/useApiQuery';
import { useApiMutation } from '@interfaces/web/hooks/useApiMutation';
import { TableForm } from '@interfaces/web/features/tables/TableForm';
import styles from '@interfaces/web/components/ui.module.css';

export default function TablesPage(): JSX.Element {
  const tablesQuery = useApiQuery(() => api.tables.list(), []);
  const [editing, setEditing] = useState<TableDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null
  );
  const removeTable = useApiMutation(api.tables.remove);

  const handleSaved = (): void => {
    setEditing(null);
    setCreating(false);
    tablesQuery.refetch();
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (confirmingDeleteId !== id) {
      setConfirmingDeleteId(id);
      return;
    }
    setConfirmingDeleteId(null);
    await removeTable.mutate(id);
    // On failure removeTable.error renders below; refetching is harmless
    tablesQuery.refetch();
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Tables</h1>
          <p className={styles.pageSubtitle}>
            The tables guests can be seated at.
          </p>
        </div>
        {!creating && !editing && (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => setCreating(true)}
          >
            Add table
          </button>
        )}
      </div>

      {creating && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Add table</h2>
          <TableForm onSaved={handleSaved} onCancel={() => setCreating(false)} />
        </section>
      )}

      {editing && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            Edit table #{editing.tableNumber}
          </h2>
          <TableForm
            table={editing}
            onSaved={handleSaved}
            onCancel={() => setEditing(null)}
          />
        </section>
      )}

      {removeTable.error && (
        <div className={styles.errorBox} role="alert">
          Could not delete table: {removeTable.error.message}
        </div>
      )}

      {tablesQuery.isLoading && (
        <p className={styles.stateMessage}>Loading tables…</p>
      )}

      {tablesQuery.error && (
        <div className={styles.errorBox} role="alert">
          Could not load tables: {tablesQuery.error.message}{' '}
          <button
            type="button"
            className={styles.rowButton}
            onClick={tablesQuery.refetch}
          >
            Retry
          </button>
        </div>
      )}

      {tablesQuery.data && tablesQuery.data.tables.length === 0 && (
        <div className={styles.empty}>
          No tables yet. Add your first table to start taking reservations.
        </div>
      )}

      {tablesQuery.data && tablesQuery.data.tables.length > 0 && (
        <table className={styles.listTable}>
          <thead>
            <tr>
              <th>Table #</th>
              <th>Capacity</th>
              <th>Location</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {tablesQuery.data.tables.map((table) => (
              <tr key={table.id}>
                <td>{table.tableNumber}</td>
                <td>{table.capacity}</td>
                <td>{table.location ?? '—'}</td>
                <td>
                  <span className={statusBadgeClass(table.status)}>
                    {table.status}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.rowButton}
                      onClick={() => {
                        setCreating(false);
                        setEditing(table);
                        setConfirmingDeleteId(null);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={styles.dangerButton}
                      onClick={() => void handleDelete(table.id)}
                      disabled={removeTable.isPending}
                    >
                      {confirmingDeleteId === table.id
                        ? 'Confirm delete'
                        : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function statusBadgeClass(status: string): string {
  if (status === 'available') {
    return styles.badge;
  }
  if (status === 'reserved') {
    return styles.badgeWarning;
  }
  return styles.badgeMuted;
}
