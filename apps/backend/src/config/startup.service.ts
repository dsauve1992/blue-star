import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { MigrationService } from './migration.service';
import { NOTIFICATION_SERVICE } from '../modules/notification/constants/tokens';
import type { NotificationService } from '../modules/notification/domain/services/notification.service';
import { NotificationTopic } from '../modules/notification/domain/value-objects/notification-topic';
import { NotificationMessage } from '../modules/notification/domain/value-objects/notification-message';
import { NotificationTitle } from '../modules/notification/domain/value-objects/notification-title';
import { NotificationPriority } from '../modules/notification/domain/services/notification.service';

@Injectable()
export class StartupService implements OnModuleInit {
  constructor(
    private readonly migrationService: MigrationService,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationService: NotificationService,
  ) {}

  async onModuleInit() {
    try {
      console.log('Running database migrations on startup...');
      await this.migrationService.runMigrations();
      console.log('Database migrations completed successfully');
    } catch (error) {
      console.error('Failed to run database migrations:', error);
      // Don't throw here to allow the application to start
      // In production, you might want to fail fast
    }

    try {
      console.log('Sending startup notification...');
      await this.notificationService.send({
        topic: NotificationTopic.of('blue-star-backend'),
        message: NotificationMessage.of('Backend server is up and running! 🚀'),
        title: NotificationTitle.of('Blue Star Backend Started'),
        priority: NotificationPriority.DEFAULT,
        tags: ['✅', 'backend', 'startup'],
      });
      console.log('Startup notification sent successfully');
    } catch (error) {
      console.error('Failed to send startup notification:', error);
      // Don't throw here - notification failure shouldn't prevent startup
    }
  }
}
