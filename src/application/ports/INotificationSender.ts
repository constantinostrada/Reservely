export type NotificationChannel = 'email' | 'sms';

export interface NotificationMessage {
  channel: NotificationChannel;
  /** Email address or phone number, depending on the channel. */
  to: string;
  /** Email only; SMS messages are body-only. */
  subject?: string;
  body: string;
}

/**
 * Port for the outbound email/SMS gateway. Callers never talk to a
 * concrete provider; delivery failures surface as a rejected promise.
 */
export interface INotificationSender {
  send(message: NotificationMessage): Promise<void>;
}
