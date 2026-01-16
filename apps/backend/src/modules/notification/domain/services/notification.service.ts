import { NotificationTopic } from '../value-objects/notification-topic';
import { NotificationMessage } from '../value-objects/notification-message';
import { NotificationTitle } from '../value-objects/notification-title';

export interface SendNotificationRequest {
  topic: NotificationTopic;
  message: NotificationMessage;
  title?: NotificationTitle;
  priority?: NotificationPriority;
  tags?: string[];
}

export enum NotificationPriority {
  MIN = 1,
  LOW = 2,
  DEFAULT = 3,
  HIGH = 4,
  MAX = 5,
}

export interface NotificationService {
  send(request: SendNotificationRequest): Promise<void>;
}
