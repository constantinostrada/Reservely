export interface DomainEvent {
  readonly type: string;
  readonly occurredAt: Date;
}

/**
 * Events carry the facts known at the moment they happened (snapshots,
 * not live references) so subscribers can act on them later without
 * assuming the aggregate is still in that state.
 */
export interface ReservationConfirmedEvent extends DomainEvent {
  readonly type: 'reservation.confirmed';
  readonly reservationId: string;
  readonly restaurantId: string;
  readonly guestName: string;
  readonly guestEmail: string;
  readonly guestPhone?: string;
  /** UTC instant. */
  readonly startsAt: Date;
  readonly partySize: number;
}

export interface PaymentSucceededEvent extends DomainEvent {
  readonly type: 'payment.succeeded';
  readonly paymentId: string;
  readonly orderId: string;
  readonly restaurantId: string;
  /** Integer cents, tip included. */
  readonly amountCents: number;
}

/**
 * A waitlisted guest was auto-promoted into a confirmed reservation because a
 * spot opened up. Carries the same guest/slot facts as a confirmation so the
 * notification pipeline can reach the guest without a further lookup.
 */
export interface WaitlistPromotedEvent extends DomainEvent {
  readonly type: 'waitlist.promoted';
  readonly waitlistEntryId: string;
  readonly reservationId: string;
  readonly restaurantId: string;
  readonly guestName: string;
  readonly guestEmail: string;
  readonly guestPhone?: string;
  /** UTC instant. */
  readonly startsAt: Date;
  readonly partySize: number;
}

export type ReservelyDomainEvent =
  | ReservationConfirmedEvent
  | PaymentSucceededEvent
  | WaitlistPromotedEvent;
