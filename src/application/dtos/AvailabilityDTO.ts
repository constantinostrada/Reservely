export interface GetAvailabilityDTO {
  /** Calendar date in the restaurant's local time zone, YYYY-MM-DD */
  date: string;
  partySize: number;
}

export interface SlotDTO {
  /** UTC instant, ISO 8601 */
  startsAt: string;
  /** UTC instant, ISO 8601 */
  endsAt: string;
}

export interface TableAvailabilityDTO {
  tableId: string;
  tableNumber: number;
  capacity: number;
  location?: string;
  freeSlots: SlotDTO[];
}

export interface CombinationTableDTO {
  tableId: string;
  tableNumber: number;
  capacity: number;
  location?: string;
}

/**
 * A slot bookable only by pushing several adjacent tables together, for a party
 * too large for any single table. Booking such a slot places one atomic
 * multi-table hold.
 */
export interface CombinationAvailabilityDTO {
  startsAt: string;
  endsAt: string;
  /** Combined seats across the tables. */
  totalCapacity: number;
  tables: CombinationTableDTO[];
}

export interface AvailabilityDTO {
  restaurantId: string;
  /** The local calendar date the availability was computed for */
  date: string;
  /** IANA time zone the date was interpreted in */
  timezone: string;
  partySize: number;
  slotDurationMinutes: number;
  tables: TableAvailabilityDTO[];
  /** Slots servable only by combining adjacent tables (large parties). */
  combinations: CombinationAvailabilityDTO[];
}
