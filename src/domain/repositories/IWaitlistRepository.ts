import { WaitlistEntry } from '../entities/WaitlistEntry';
import { Reservation } from '../entities/Reservation';

/** The slot a cancellation just freed, offered to the waitlist. */
export interface FreedSlot {
  restaurantId: string;
  tableId: string;
  startsAt: Date;
  endsAt: Date;
}

/** Outcome of a successful promotion: the new reservation and the entry. */
export interface WaitlistPromotion {
  reservation: Reservation;
  entry: WaitlistEntry;
}

export interface IWaitlistRepository {
  save(entry: WaitlistEntry): Promise<WaitlistEntry>;

  findById(id: string): Promise<WaitlistEntry | null>;

  /** Currently-waiting entries for a restaurant, oldest first. */
  findWaiting(restaurantId: string): Promise<WaitlistEntry[]>;

  /** How many entries are still waiting for a given slot start. */
  countWaitingForSlot(restaurantId: string, startsAt: Date): Promise<number>;

  /**
   * Atomically hand a freed slot to the next eligible waiting entry.
   *
   * In one transaction: lock the freed table, confirm the slot is still open,
   * pick the oldest waiting-and-not-expired entry that fits the table (with
   * `FOR UPDATE SKIP LOCKED` so concurrent cancellations never contend for the
   * same entry), create a CONFIRMED reservation for that guest on the table,
   * and mark the entry promoted. Returns the promotion, or null when there is
   * no eligible entry (or the slot was re-taken). Guarantees that two
   * simultaneous cancellations freeing space can never promote one entry twice.
   */
  promoteNextForFreedSlot(slot: FreedSlot): Promise<WaitlistPromotion | null>;

  /**
   * Expire every still-waiting entry whose slot start time is at or before
   * `now` for the given restaurant. Returns the number of entries expired.
   */
  expireStale(restaurantId: string, now: Date): Promise<number>;
}
