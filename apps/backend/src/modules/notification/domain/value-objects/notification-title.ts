export class NotificationTitle {
  private constructor(public readonly value: string) {}

  static of(title: string): NotificationTitle {
    if (!title || title.trim().length === 0) {
      throw new Error('Notification title cannot be empty');
    }

    if (title.length > 200) {
      throw new Error('Notification title cannot exceed 200 characters');
    }

    return new NotificationTitle(title);
  }
}
