import { ReservelyDomainEvent } from '@domain/events/DomainEvent';

/**
 * Port for handing domain events off the request path.
 *
 * publish must return immediately and must never throw: subscribers run
 * asynchronously after the publishing operation has completed, so a slow
 * or failing subscriber can never break or delay the operation that
 * raised the event.
 */
export interface IEventPublisher {
  publish(event: ReservelyDomainEvent): void;
}
