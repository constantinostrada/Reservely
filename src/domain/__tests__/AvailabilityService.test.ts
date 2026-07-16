import { AvailabilityService } from '../services/AvailabilityService';
import { Reservation } from '../entities/Reservation';
import { Table } from '../entities/Table';
import { TimeSlot } from '../value-objects/TimeSlot';
import { Email } from '../value-objects/Email';
import { ReservationStatus } from '../value-objects/ReservationStatus';
import { TableStatus } from '../value-objects/TableStatus';

const at = (iso: string) => new Date(iso);

// A UTC service window equivalent to 11:00–22:00 local in a UTC restaurant
const window = new TimeSlot(at('2026-07-16T11:00:00Z'), at('2026-07-16T22:00:00Z'));

const makeTable = (id: string, capacity: number, status = TableStatus.available()) =>
  new Table({
    id,
    restaurantId: 'rest-1',
    tableNumber: Number(id.replace(/\D/g, '')) || 1,
    capacity,
    status,
  });

const makeReservation = (
  tableId: string,
  startIso: string,
  status = ReservationStatus.confirmed()
) =>
  new Reservation({
    restaurantId: 'rest-1',
    tableId,
    guestName: 'Guest',
    guestEmail: new Email('guest@example.com'),
    startsAt: at(startIso),
    partySize: 2,
    status,
  });

describe('AvailabilityService', () => {
  const service = new AvailabilityService();

  describe('generateCandidateSlots', () => {
    it('generates 90-minute slots every 30 minutes that fit in the window', () => {
      const slots = service.generateCandidateSlots(window, 90, 30);

      // 11:00 through 20:30 inclusive = 20 starts
      expect(slots).toHaveLength(20);
      expect(slots[0].start.toISOString()).toBe('2026-07-16T11:00:00.000Z');
      expect(slots[0].end.toISOString()).toBe('2026-07-16T12:30:00.000Z');
      const last = slots[slots.length - 1];
      expect(last.start.toISOString()).toBe('2026-07-16T20:30:00.000Z');
      expect(last.end.toISOString()).toBe('2026-07-16T22:00:00.000Z');
    });

    it('never generates a slot that would run past closing', () => {
      const slots = service.generateCandidateSlots(window, 90, 30);
      for (const slot of slots) {
        expect(slot.end.getTime()).toBeLessThanOrEqual(window.end.getTime());
      }
    });
  });

  describe('computeFreeSlots', () => {
    it('excludes tables too small for the party', () => {
      const tables = [makeTable('t-1', 2), makeTable('t-2', 6)];

      const result = service.computeFreeSlots(tables, [], window, 4, 90);

      expect(result).toHaveLength(1);
      expect(result[0].table.id).toBe('t-2');
    });

    it('excludes non-available tables', () => {
      const tables = [makeTable('t-1', 4, TableStatus.unavailable())];

      const result = service.computeFreeSlots(tables, [], window, 2, 90);

      expect(result).toHaveLength(0);
    });

    it('removes slots overlapping an active reservation, per table', () => {
      const tables = [makeTable('t-1', 4), makeTable('t-2', 4)];
      // t-1 booked 18:00–19:30; t-2 has no bookings
      const reservations = [makeReservation('t-1', '2026-07-16T18:00:00Z')];

      const [t1, t2] = service.computeFreeSlots(
        tables,
        reservations,
        window,
        2,
        90
      );

      // Starts 17:00, 17:30, 18:00, 18:30 and 19:00 overlap the booking;
      // 16:30 ends exactly at 18:00 (half-open → free) and 19:30 starts as
      // the booking ends
      const t1Starts = t1.freeSlots.map((s) => s.start.toISOString());
      expect(t1Starts).toContain('2026-07-16T16:30:00.000Z');
      expect(t1Starts).toContain('2026-07-16T19:30:00.000Z');
      expect(t1Starts).not.toContain('2026-07-16T17:00:00.000Z');
      expect(t1Starts).not.toContain('2026-07-16T18:00:00.000Z');
      expect(t1Starts).not.toContain('2026-07-16T19:00:00.000Z');
      expect(t1.freeSlots).toHaveLength(20 - 5);

      // The other table is unaffected
      expect(t2.freeSlots).toHaveLength(20);
    });

    it('ignores cancelled and no-show reservations', () => {
      const tables = [makeTable('t-1', 4)];
      const reservations = [
        makeReservation('t-1', '2026-07-16T18:00:00Z', ReservationStatus.cancelled()),
        makeReservation('t-1', '2026-07-16T12:00:00Z', ReservationStatus.noShow()),
      ];

      const [t1] = service.computeFreeSlots(tables, reservations, window, 2, 90);

      expect(t1.freeSlots).toHaveLength(20);
    });

    it('blocks slots for pending, confirmed and seated reservations', () => {
      const tables = [makeTable('t-1', 4)];
      for (const status of [
        ReservationStatus.pending(),
        ReservationStatus.confirmed(),
        ReservationStatus.seated(),
      ]) {
        const [t1] = service.computeFreeSlots(
          tables,
          [makeReservation('t-1', '2026-07-16T18:00:00Z', status)],
          window,
          2,
          90
        );
        expect(t1.freeSlots.length).toBeLessThan(20);
      }
    });
  });

  describe('isWithinServiceWindow', () => {
    it('accepts a slot inside the window and rejects one past closing', () => {
      const ok = TimeSlot.fromDuration(at('2026-07-16T20:30:00Z'), 90);
      const tooLate = TimeSlot.fromDuration(at('2026-07-16T21:00:00Z'), 90);
      expect(service.isWithinServiceWindow(ok, window)).toBe(true);
      expect(service.isWithinServiceWindow(tooLate, window)).toBe(false);
    });
  });
});
