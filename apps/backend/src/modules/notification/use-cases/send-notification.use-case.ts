import { Inject, Injectable } from '@nestjs/common';
import {
  NotificationService,
  SendNotificationRequest,
} from '../domain/services/notification.service';
import { NOTIFICATION_SERVICE } from '../constants/tokens';

@Injectable()
export class SendNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationService: NotificationService,
  ) {}

  async execute(request: SendNotificationRequest): Promise<void> {
    await this.notificationService.send(request);
  }
}
