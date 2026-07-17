import {
  INotificationSender,
  NotificationMessage,
} from '@application/ports/INotificationSender';

/**
 * Development stand-in for a real email/SMS gateway: delivery is a log
 * line. Swap in a real provider adapter behind the same port without
 * touching any caller.
 */
export class MockNotificationSender implements INotificationSender {
  async send(message: NotificationMessage): Promise<void> {
    const subject = message.subject ? ` subject="${message.subject}"` : '';
    // eslint-disable-next-line no-console -- the log line IS this mock's delivery
    console.log(
      `[notification:${message.channel}] to=${message.to}${subject} body="${message.body}"`
    );
  }
}
