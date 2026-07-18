export interface JoinWaitlistDTO {
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  /** Calendar date in the restaurant's local time zone, YYYY-MM-DD */
  date: string;
  /** Local wall-clock time in the restaurant's time zone, HH:mm */
  time: string;
  partySize: number;
}

export interface WaitlistEntryDTO {
  id: string;
  restaurantId: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  partySize: number;
  /** UTC instant, ISO 8601 */
  startsAt: string;
  /** UTC instant, ISO 8601 */
  endsAt: string;
  status: string;
  promotedReservationId?: string;
  /** 1-based place in line for the slot at the time of joining (waiting only). */
  position?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WaitlistListDTO {
  entries: WaitlistEntryDTO[];
  total: number;
}
