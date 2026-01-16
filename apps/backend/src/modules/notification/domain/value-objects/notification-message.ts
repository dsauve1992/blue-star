export class NotificationMessage {
  private constructor(public readonly value: string) {}

  static of(message: string): NotificationMessage {
    if (!message || message.trim().length === 0) {
      throw new Error('Notification message cannot be empty');
    }

    if (message.length > 4000) {
      throw new Error('Notification message cannot exceed 4000 characters');
    }

    return new NotificationMessage(message);
  }
}
