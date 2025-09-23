import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { MigrationService } from './migration.service';
import { StartupService } from './startup.service';

@Module({
  imports: [ConfigModule],
  providers: [DatabaseService, MigrationService, StartupService],
  exports: [DatabaseService, MigrationService],
})
export class DatabaseModule {}
