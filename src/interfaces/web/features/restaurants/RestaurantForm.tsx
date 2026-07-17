'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import type {
  RestaurantDTO,
  UpdateRestaurantDTO,
} from '@application/dtos/RestaurantDTO';
import { api } from '../../api/client';
import { useApiMutation } from '../../hooks/useApiMutation';
import { FormErrorMessage } from '../../components/FormErrorMessage';
import styles from '../../components/ui.module.css';

interface RestaurantFormProps {
  /** When present the form edits this restaurant; otherwise it creates one. */
  restaurant?: RestaurantDTO;
  onSaved: (saved: RestaurantDTO) => void;
  onCancel: () => void;
}

export function RestaurantForm({
  restaurant,
  onSaved,
  onCancel,
}: RestaurantFormProps): JSX.Element {
  const [name, setName] = useState(restaurant?.name ?? '');
  const [slug, setSlug] = useState(restaurant?.slug ?? '');
  const [timezone, setTimezone] = useState(restaurant?.timezone ?? '');
  const [currency, setCurrency] = useState(restaurant?.currency ?? '');
  const [address, setAddress] = useState(restaurant?.address ?? '');
  const [phone, setPhone] = useState(restaurant?.phone ?? '');

  const create = useApiMutation(api.restaurants.create);
  const update = useApiMutation(
    (args: { id: string; input: UpdateRestaurantDTO }) =>
      api.restaurants.update(args.id, args.input)
  );

  const isPending = create.isPending || update.isPending;
  const error = restaurant ? update.error : create.error;

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const common = {
      name,
      timezone: emptyToUndefined(timezone),
      currency: emptyToUndefined(currency),
      address: emptyToUndefined(address),
      phone: emptyToUndefined(phone),
    };

    const saved = restaurant
      ? await update.mutate({ id: restaurant.id, input: common })
      : await create.mutate({ ...common, slug });

    if (saved) {
      onSaved(saved);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <FormErrorMessage error={error} />}

      <div className={styles.formRow}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="restaurant-name">
            Name
          </label>
          <input
            id="restaurant-name"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="restaurant-slug">
            Slug
          </label>
          <input
            id="restaurant-slug"
            className={styles.input}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={Boolean(restaurant)}
            placeholder="my-restaurant"
            required={!restaurant}
          />
          <span className={styles.hint}>
            {restaurant
              ? 'The slug is the public identifier and cannot be changed.'
              : 'Lowercase letters, numbers and hyphens.'}
          </span>
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="restaurant-timezone">
            Time zone
          </label>
          <input
            id="restaurant-timezone"
            className={styles.input}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="Europe/Rome"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="restaurant-currency">
            Currency
          </label>
          <input
            id="restaurant-currency"
            className={styles.input}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            placeholder="EUR"
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="restaurant-address">
            Address
          </label>
          <input
            id="restaurant-address"
            className={styles.input}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="restaurant-phone">
            Phone
          </label>
          <input
            id="restaurant-phone"
            className={styles.input}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={isPending}
        >
          {isPending
            ? 'Saving…'
            : restaurant
              ? 'Save changes'
              : 'Create restaurant'}
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

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}
