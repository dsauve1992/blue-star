import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { MigrationService } from './migration.service';
import {
  NOTIFICATION_SERVICE,
  NotificationMessage,
  NotificationPriority,
  NotificationTitle,
  NotificationTopic,
  type NotificationService,
} from '../modules/notification/notification.module';

const MAX_MESSAGE_LENGTH = 4000;

@Injectable()
export class StartupService implements OnModuleInit {
  constructor(
    private readonly migrationService: MigrationService,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationService: NotificationService,
  ) {}

  async onModuleInit() {
    let migrationFailure: string | undefined;
    try {
      console.log('Running database migrations on startup...');
      await this.migrationService.runMigrations();
      console.log('Database migrations completed successfully');
    } catch (error) {
      console.error('Failed to run database migrations:', error);
      migrationFailure =
        (error instanceof Error && error.message.trim()) || 'Unknown error';
      // Don't throw here to allow the application to start
      // In production, you might want to fail fast
    }

    try {
      console.log('Sending startup notification...');
      await this.notificationService.send(
        migrationFailure === undefined
          ? {
              topic: NotificationTopic.of('blue-star-backend'),
              message: NotificationMessage.of(
                'Backend server is up and running! 🚀',
              ),
              title: NotificationTitle.of('Blue Star Backend Started'),
              priority: NotificationPriority.DEFAULT,
              tags: ['✅', 'backend', 'startup'],
            }
          : {
              topic: NotificationTopic.of('blue-star-backend'),
              message: NotificationMessage.of(truncate(migrationFailure)),
              title: NotificationTitle.of(
                'Blue Star Backend Started — migrations FAILED',
              ),
              priority: NotificationPriority.HIGH,
              tags: ['warning', 'backend', 'startup'],
            },
      );
      console.log('Startup notification sent successfully');
    } catch (error) {
      console.error('Failed to send startup notification:', error);
      // Don't throw here - notification failure shouldn't prevent startup
    }
  }
}

function truncate(message: string): string {
  return message.length > MAX_MESSAGE_LENGTH
    ? `${message.slice(0, MAX_MESSAGE_LENGTH - 1)}…`
    : message;
}
