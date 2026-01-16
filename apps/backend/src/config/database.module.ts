import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { MigrationService } from './migration.service';
import { StartupService } from './startup.service';
import { NotificationModule } from '../modules/notification/notification.module';

@Module({
  imports: [ConfigModule, NotificationModule],
  providers: [DatabaseService, MigrationService, StartupService],
  exports: [DatabaseService, MigrationService],
})
export class DatabaseModule {}
