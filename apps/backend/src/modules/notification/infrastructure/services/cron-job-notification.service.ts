import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { NOTIFICATION_SERVICE } from '../../constants/tokens';
import type { NotificationService } from '../../domain/services/notification.service';
import { NotificationTopic } from '../../domain/value-objects/notification-topic';
import { NotificationMessage } from '../../domain/value-objects/notification-message';
import { NotificationTitle } from '../../domain/value-objects/notification-title';
import { NotificationPriority } from '../../domain/services/notification.service';

export interface CronJobNotificationOptions {
  jobName: string;
  jobType?: string;
  frequency?: string;
  additionalData?: string;
}

@Injectable()
export class CronJobNotificationService {
  private readonly logger = new Logger(CronJobNotificationService.name);
  private readonly topic = NotificationTopic.of('blue-star-cron-jobs');

  constructor(
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationService: NotificationService,
  ) {}

  async notifyJobStart(options: CronJobNotificationOptions): Promise<void> {
    const { jobName, jobType, frequency } = options;
    const tags = ['🔄', 'cron'];
    if (jobType) tags.push(jobType);
    if (frequency) tags.push(frequency);

    try {
      await this.notificationService.send({
        topic: this.topic,
        message: NotificationMessage.of(`Starting ${jobName}...`),
        title: NotificationTitle.of(`${jobName} Started`),
        priority: NotificationPriority.LOW,
        tags,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to send start notification for ${jobName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async notifyJobSuccess(options: CronJobNotificationOptions): Promise<void> {
    const { jobName, jobType, frequency, additionalData } = options;
    const tags = ['✅', 'cron', 'success'];
    if (jobType) tags.push(jobType);
    if (frequency) tags.push(frequency);

    const message = additionalData
      ? `${jobName} completed successfully: ${additionalData}`
      : `${jobName} completed successfully`;

    try {
      await this.notificationService.send({
        topic: this.topic,
        message: NotificationMessage.of(message),
        title: NotificationTitle.of(`${jobName} Completed`),
        priority: NotificationPriority.DEFAULT,
        tags,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to send success notification for ${jobName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async notifyJobError(
    options: CronJobNotificationOptions,
    error: unknown,
  ): Promise<void> {
    const { jobName, jobType, frequency } = options;
    const tags = ['❌', 'cron', 'error'];
    if (jobType) tags.push(jobType);
    if (frequency) tags.push(frequency);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    try {
      await this.notificationService.send({
        topic: this.topic,
        message: NotificationMessage.of(`${jobName} failed: ${errorMessage}`),
        title: NotificationTitle.of(`${jobName} Failed`),
        priority: NotificationPriority.HIGH,
        tags,
      });
    } catch (notificationError) {
      this.logger.warn(
        `Failed to send error notification for ${jobName}: ${notificationError instanceof Error ? notificationError.message : 'Unknown error'}`,
      );
    }
  }
}
