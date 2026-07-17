'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import type { TableDTO, UpdateTableDTO } from '@application/dtos/TableDTO';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { FormErrorMessage } from '../../components/FormErrorMessage';
import styles from '../../components/ui.module.css';

const TABLE_STATUSES = ['available', 'reserved', 'unavailable'] as const;

interface TableFormProps {
  /** When present the form edits this table; otherwise it creates one. */
  table?: TableDTO;
  onSaved: (saved: TableDTO) => void;
  onCancel: () => void;
}

export function TableForm({
  table,
  onSaved,
  onCancel,
}: TableFormProps): JSX.Element {
  const [tableNumber, setTableNumber] = useState(
    table ? String(table.tableNumber) : ''
  );
  const [capacity, setCapacity] = useState(table ? String(table.capacity) : '');
  const [location, setLocation] = useState(table?.location ?? '');
  const [status, setStatus] = useState(table?.status ?? 'available');

  const create = useApiMutation(api.tables.create);
  const update = useApiMutation((args: { id: string; input: UpdateTableDTO }) =>
    api.tables.update(args.id, args.input)
  );

  const isPending = create.isPending || update.isPending;
  const error = table ? update.error : create.error;

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const common = {
      tableNumber: Number(tableNumber),
      capacity: Number(capacity),
      location: location.trim() === '' ? undefined : location.trim(),
    };

    const saved = table
      ? await update.mutate({ id: table.id, input: { ...common, status } })
      : await create.mutate(common);

    if (saved) {
      onSaved(saved);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <FormErrorMessage error={error} />}

      <div className={styles.formRow}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="table-number">
            Table number
          </label>
          <input
            id="table-number"
            className={styles.input}
            type="number"
            min={1}
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="table-capacity">
            Capacity
          </label>
          <input
            id="table-capacity"
            className={styles.input}
            type="number"
            min={1}
            max={20}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            required
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="table-location">
            Location
          </label>
          <input
            id="table-location"
            className={styles.input}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Patio, main hall…"
          />
        </div>
        {table && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="table-status">
              Status
            </label>
            <select
              id="table-status"
              className={styles.select}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {TABLE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={isPending}
        >
          {isPending ? 'Saving…' : table ? 'Save changes' : 'Add table'}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
