export class NotificationTopic {
  private constructor(public readonly value: string) {}

  static of(topic: string): NotificationTopic {
    if (!topic || topic.trim().length === 0) {
      throw new Error('Notification topic cannot be empty');
    }

    if (topic.length > 64) {
      throw new Error('Notification topic cannot exceed 64 characters');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(topic)) {
      throw new Error(
        'Notification topic can only contain letters, numbers, underscores, and hyphens',
      );
    }

    return new NotificationTopic(topic);
  }
}
