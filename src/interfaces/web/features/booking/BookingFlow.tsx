'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { AvailabilityDTO } from '@application/dtos/AvailabilityDTO';
import type { ReservationDTO } from '@application/dtos/ReservationDTO';
import { api } from '../../api/client';
import { ApiError, toError } from '../../api/http';
import { useApiQuery } from '../../hooks/useApiQuery';
import { FormErrorMessage } from '../../components/FormErrorMessage';
import { localTimeLabel, localTimeValue, todayISODate } from './slotTime';
import styles from './booking.module.css';

interface Slot {
  /** UTC instant of the slot start (dedup key). */
  startsAt: string;
  /** Local wall-clock time to submit, HH:mm. */
  time: string;
  /** Friendly label, e.g. "6:30 PM". */
  label: string;
}

/**
 * The customer-facing booking flow for one restaurant: pick a date and party
 * size, see the truly-free slots the availability engine returns, and book
 * one. A slot taken between viewing and submitting comes back as a 409 from
 * the transactional slot hold, which we surface as a clear "no longer
 * available" state rather than failing silently.
 */
export function BookingFlow({
  restaurantId,
}: {
  restaurantId: string;
}): JSX.Element {
  const restaurantQuery = useApiQuery(
    () => api.public.getRestaurant(restaurantId),
    [restaurantId]
  );

  const [date, setDate] = useState(todayISODate());
  const [partySize, setPartySize] = useState(2);

  const availabilityQuery = useApiQuery(
    () => api.public.availability(restaurantId, { date, partySize }),
    [restaurantId, date, partySize]
  );

  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<Error | null>(null);
  const [tookNotice, setTookNotice] = useState(false);
  const [confirmed, setConfirmed] = useState<ReservationDTO | null>(null);

  const restaurant = restaurantQuery.data;
  const timezone = availabilityQuery.data?.timezone ?? restaurant?.timezone;

  const slots = useMemo(
    () => toSlots(availabilityQuery.data),
    [availabilityQuery.data]
  );

  // Changing the search resets any slot the guest had picked and clears the
  // stale "no longer available" notice.
  const changeSearch = (apply: () => void): void => {
    apply();
    setSelectedSlot(null);
    setSubmitError(null);
    setTookNotice(false);
  };

  const resetForBooking = (): void => {
    setConfirmed(null);
    setSelectedSlot(null);
    setGuestName('');
    setGuestEmail('');
    setGuestPhone('');
    setNotes('');
    setSubmitError(null);
    setTookNotice(false);
    availabilityQuery.refetch();
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    if (!selectedSlot) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setTookNotice(false);
    try {
      const reservation = await api.public.reserve(restaurantId, {
        guestName,
        guestEmail,
        guestPhone: guestPhone.trim() || undefined,
        date,
        time: selectedSlot.time,
        partySize,
        notes: notes.trim() || undefined,
      });
      setConfirmed(reservation);
    } catch (err) {
      // 409 = the slot was taken between viewing and submitting. Show the
      // dedicated unavailable state and refresh availability so the now-gone
      // slot disappears from the list.
      if (err instanceof ApiError && err.status === 409) {
        setTookNotice(true);
        setSelectedSlot(null);
        availabilityQuery.refetch();
      } else {
        setSubmitError(toError(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed && restaurant) {
    return (
      <ConfirmationView
        reservation={confirmed}
        restaurantName={restaurant.name}
        timezone={restaurant.timezone}
        onBookAnother={resetForBooking}
      />
    );
  }

  return (
    <div>
      <Link href="/book" className={styles.back}>
        ← All restaurants
      </Link>

      {restaurantQuery.isLoading && (
        <p className={styles.stateMessage}>Loading…</p>
      )}

      {restaurantQuery.error && (
        <div className={styles.errorBox} role="alert">
          Could not load this restaurant: {restaurantQuery.error.message}{' '}
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={restaurantQuery.refetch}
          >
            Retry
          </button>
        </div>
      )}

      {restaurant && (
        <div className={styles.hero}>
          <h1 className={styles.title}>{restaurant.name}</h1>
          <p className={styles.subtitle}>
            {restaurant.address ? `${restaurant.address} · ` : ''}Book a table
            below.
          </p>
        </div>
      )}

      <div className={styles.searchCard}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="booking-date">
            Date
          </label>
          <input
            id="booking-date"
            type="date"
            className={styles.input}
            value={date}
            min={todayISODate()}
            onChange={(e) => changeSearch(() => setDate(e.target.value))}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="booking-party">
            Party size
          </label>
          <select
            id="booking-party"
            className={styles.select}
            value={partySize}
            onChange={(e) =>
              changeSearch(() => setPartySize(Number(e.target.value)))
            }
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'guest' : 'guests'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {tookNotice && (
        <div className={styles.unavailable} role="alert">
          <strong>That time is no longer available.</strong>
          Someone just booked the last table for that slot. Please pick another
          time below — the list has been refreshed.
        </div>
      )}

      <h2 className={styles.sectionTitle}>Available times</h2>

      {availabilityQuery.isLoading && (
        <p className={styles.stateMessage}>Checking availability…</p>
      )}

      {availabilityQuery.error && (
        <div className={styles.errorBox} role="alert">
          Could not load availability: {availabilityQuery.error.message}{' '}
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={availabilityQuery.refetch}
          >
            Retry
          </button>
        </div>
      )}

      {availabilityQuery.data && slots.length === 0 && (
        <div className={styles.empty}>
          No tables available for {partySize}{' '}
          {partySize === 1 ? 'guest' : 'guests'} on this date. Try another date
          or a smaller party.
        </div>
      )}

      {slots.length > 0 && (
        <div className={styles.slotGrid}>
          {slots.map((slot) => (
            <button
              key={slot.startsAt}
              type="button"
              className={
                selectedSlot?.startsAt === slot.startsAt
                  ? styles.slotSelected
                  : styles.slot
              }
              onClick={() => {
                setSelectedSlot(slot);
                setSubmitError(null);
                setTookNotice(false);
              }}
            >
              {slot.label}
            </button>
          ))}
        </div>
      )}

      {selectedSlot && (
        <form className={styles.bookCard} onSubmit={handleSubmit}>
          <h3 className={styles.bookCardTitle}>Complete your booking</h3>
          <p className={styles.bookCardMeta}>
            {slotDateLabel(selectedSlot.startsAt, timezone)} · {partySize}{' '}
            {partySize === 1 ? 'guest' : 'guests'}
          </p>

          {submitError && <FormErrorMessage error={submitError} />}

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label className={styles.label} htmlFor="guest-name">
                Name
              </label>
              <input
                id="guest-name"
                className={styles.input}
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
                maxLength={100}
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.label} htmlFor="guest-email">
                Email
              </label>
              <input
                id="guest-email"
                type="email"
                className={styles.input}
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label className={styles.label} htmlFor="guest-phone">
                Phone <span style={{ color: '#999' }}>(optional)</span>
              </label>
              <input
                id="guest-phone"
                className={styles.input}
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                maxLength={20}
              />
            </div>
          </div>

          <div className={styles.formField}>
            <label className={styles.label} htmlFor="guest-notes">
              Notes <span style={{ color: '#999' }}>(optional)</span>
            </label>
            <textarea
              id="guest-notes"
              className={styles.input}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>

          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={submitting}
            >
              {submitting ? 'Booking…' : 'Confirm booking'}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setSelectedSlot(null)}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Aggregate free slots across all tables into distinct start times. */
function toSlots(availability: AvailabilityDTO | undefined): Slot[] {
  if (!availability) {
    return [];
  }
  const byStart = new Map<string, Slot>();
  for (const table of availability.tables) {
    for (const slot of table.freeSlots) {
      if (!byStart.has(slot.startsAt)) {
        byStart.set(slot.startsAt, {
          startsAt: slot.startsAt,
          time: localTimeValue(slot.startsAt, availability.timezone),
          label: localTimeLabel(slot.startsAt, availability.timezone),
        });
      }
    }
  }
  return [...byStart.values()].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt)
  );
}

function slotDateLabel(isoInstant: string, timezone?: string): string {
  if (!timezone) {
    return '';
  }
  const dateLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(isoInstant));
  return `${dateLabel} at ${localTimeLabel(isoInstant, timezone)}`;
}

function ConfirmationView({
  reservation,
  restaurantName,
  timezone,
  onBookAnother,
}: {
  reservation: ReservationDTO;
  restaurantName: string;
  timezone: string;
  onBookAnother: () => void;
}): JSX.Element {
  return (
    <div className={styles.confirmCard}>
      <div className={styles.confirmBadge}>✓</div>
      <h1 className={styles.confirmTitle}>You&apos;re booked!</h1>
      <p className={styles.confirmSummary}>
        <strong>{restaurantName}</strong>
        <br />
        {slotDateLabel(reservation.startsAt, timezone)}
        <br />
        {reservation.partySize}{' '}
        {reservation.partySize === 1 ? 'guest' : 'guests'} · under{' '}
        <strong>{reservation.guestName}</strong>
        <br />
        A confirmation has been sent to {reservation.guestEmail}.
      </p>
      <button
        type="button"
        className={styles.secondaryButton}
        onClick={onBookAnother}
      >
        Book another time
      </button>
    </div>
  );
}
