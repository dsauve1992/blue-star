import { Injectable } from '@nestjs/common';
import type { NotificationService } from '../../domain/services/notification.service';

@Injectable()
export class NoopNotificationService implements NotificationService {
  async send(): Promise<void> {}
}
