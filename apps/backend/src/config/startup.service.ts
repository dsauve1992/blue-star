import { Injectable, OnModuleInit } from '@nestjs/common';
import { MigrationService } from './migration.service';

@Injectable()
export class StartupService implements OnModuleInit {
  constructor(private readonly migrationService: MigrationService) {}

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
  }
}
