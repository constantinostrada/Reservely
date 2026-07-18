export interface CreateReservationDTO {
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  /** Calendar date in the restaurant's local time zone, YYYY-MM-DD */
  date: string;
  /** Local wall-clock time in the restaurant's time zone, HH:mm */
  time: string;
  partySize: number;
  /** Specific table to book; omitted → smallest suitable free table */
  tableId?: string;
  notes?: string;
}

export interface UpdateReservationDTO {
  guestName?: string;
  guestPhone?: string;
  date?: string;
  time?: string;
  partySize?: number;
  notes?: string;
}

export interface ReservationDTO {
  id: string;
  restaurantId: string;
  tableId?: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  /** UTC instant, ISO 8601 */
  startsAt: string;
  /** UTC instant, ISO 8601 */
  endsAt: string;
  partySize: number;
  status: string;
  notes?: string;
  /** Present when this row is one table of a combined (multi-table) booking. */
  combinationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationListDTO {
  reservations: ReservationDTO[];
  total: number;
}
