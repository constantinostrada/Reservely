import { ReservelyDomainEvent } from '@domain/events/DomainEvent';
import { IEventPublisher } from '@application/ports/IEventPublisher';

export type EventHandler = (event: ReservelyDomainEvent) => Promise<void>;

/**
 * In-process implementation of the event publisher port.
 *
 * publish only enqueues: handlers run on a later event-loop tick, after
 * the publishing request has moved on, and every handler is isolated —
 * a rejection or throw is logged and swallowed, never propagated to the
 * publisher or to other handlers. A durable broker (outbox table, queue)
 * can replace this class behind the same port.
 */
export class InProcessEventDispatcher implements IEventPublisher {
  private readonly handlers: EventHandler[] = [];
  private readonly pending = new Set<Promise<void>>();

  subscribe(handler: EventHandler): void {
    this.handlers.push(handler);
  }

  publish(event: ReservelyDomainEvent): void {
    for (const handler of this.handlers) {
      const run = this.runDetached(handler, event);
      this.pending.add(run);
      void run.then(() => this.pending.delete(run));
    }
  }

  /** Resolves once every dispatched handler has settled (tests, shutdown). */
  async waitForIdle(): Promise<void> {
    while (this.pending.size > 0) {
      await Promise.all([...this.pending]);
    }
  }

  private async runDetached(
    handler: EventHandler,
    event: ReservelyDomainEvent
  ): Promise<void> {
    // Yield to the event loop so publish() returns before handler code runs.
    await new Promise<void>((resolve) => setImmediate(resolve));
    try {
      await handler(event);
    } catch (error) {
      console.error(`[events] handler failed for ${event.type}:`, error);
    }
  }
}
