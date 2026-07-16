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

export interface AvailabilityDTO {
  restaurantId: string;
  /** The local calendar date the availability was computed for */
  date: string;
  /** IANA time zone the date was interpreted in */
  timezone: string;
  partySize: number;
  slotDurationMinutes: number;
  tables: TableAvailabilityDTO[];
}
