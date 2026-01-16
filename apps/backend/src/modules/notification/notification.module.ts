import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NtfyNotificationService } from './infrastructure/services/ntfy-notification.service';
import { SendNotificationUseCase } from './use-cases/send-notification.use-case';
import { CronJobNotificationService } from './infrastructure/services/cron-job-notification.service';
import { NOTIFICATION_SERVICE } from './constants/tokens';

export { NOTIFICATION_SERVICE };
export type { NotificationService } from './domain/services/notification.service';
export {
  NotificationTopic,
} from './domain/value-objects/notification-topic';
export {
  NotificationMessage,
} from './domain/value-objects/notification-message';
export {
  NotificationTitle,
} from './domain/value-objects/notification-title';
export {
  NotificationPriority,
  type SendNotificationRequest,
} from './domain/services/notification.service';
export { CronJobNotificationService } from './infrastructure/services/cron-job-notification.service';
export type { CronJobNotificationOptions } from './infrastructure/services/cron-job-notification.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: NOTIFICATION_SERVICE,
      useClass: NtfyNotificationService,
    },
    SendNotificationUseCase,
    CronJobNotificationService,
  ],
  exports: [
    NOTIFICATION_SERVICE,
    SendNotificationUseCase,
    CronJobNotificationService,
  ],
})
export class NotificationModule {}
