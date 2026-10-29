import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NtfyNotificationService } from './infrastructure/services/ntfy-notification.service';
import { NoopNotificationService } from './infrastructure/services/noop-notification.service';
import { CronJobNotificationService } from './infrastructure/services/cron-job-notification.service';
import { NOTIFICATION_SERVICE } from './constants/tokens';

export { NOTIFICATION_SERVICE };
export type { NotificationService } from './domain/services/notification.service';
export { NotificationTopic } from './domain/value-objects/notification-topic';
export { NotificationMessage } from './domain/value-objects/notification-message';
export { NotificationTitle } from './domain/value-objects/notification-title';
export {
  NotificationPriority,
  type SendNotificationRequest,
} from './domain/services/notification.service';
export { CronJobNotificationService } from './infrastructure/services/cron-job-notification.service';
export type { CronJobNotificationOptions } from './infrastructure/services/cron-job-notification.service';

@Module({
  imports: [ConfigModule],
  providers: [
    NtfyNotificationService,
    NoopNotificationService,
    {
      provide: NOTIFICATION_SERVICE,
      inject: [ConfigService, NtfyNotificationService, NoopNotificationService],
      useFactory: (
        config: ConfigService,
        ntfy: NtfyNotificationService,
        noop: NoopNotificationService,
      ) => (config.get('NOTIFICATIONS_ENABLED') === 'false' ? noop : ntfy),
    },
    CronJobNotificationService,
  ],
  exports: [NOTIFICATION_SERVICE, CronJobNotificationService],
})
export class NotificationModule {}
