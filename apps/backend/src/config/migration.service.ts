import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getDatabaseConfig } from './database.config';

const execAsync = promisify(exec);

@Injectable()
export class MigrationService {
  constructor(private readonly configService: ConfigService) {}

  async runMigrations(): Promise<void> {
    const config = getDatabaseConfig(this.configService);

    // Set environment variables for db-migrate
    process.env.DB_HOST = config.host;
    process.env.DB_PORT = config.port.toString();
    process.env.DB_USERNAME = config.username;
    process.env.DB_PASSWORD = config.password;
    process.env.DB_DATABASE = config.database;
    process.env.DB_SSL = config.ssl.toString();

    try {
      console.log('Running database migrations...');
      const { stdout, stderr } = await execAsync(
        // FIXME the --env flag should be based on your environment, e.g., 'dev', 'test', 'production'
        'npx db-migrate up --env test',
        {
          cwd: process.cwd(),
          env: process.env,
        },
      );

      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);

      console.log('Database migrations completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  async rollbackMigrations(): Promise<void> {
    const config = getDatabaseConfig(this.configService);

    // Set environment variables for db-migrate
    process.env.DB_HOST = config.host;
    process.env.DB_PORT = config.port.toString();
    process.env.DB_USERNAME = config.username;
    process.env.DB_PASSWORD = config.password;
    process.env.DB_DATABASE = config.database;
    process.env.DB_SSL = config.ssl.toString();

    try {
      console.log('Rolling back database migrations...');
      const { stdout, stderr } = await execAsync(
        'npx db-migrate down --env dev',
        {
          cwd: process.cwd(),
        },
      );

      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);

      console.log('Database rollback completed successfully');
    } catch (error) {
      console.error('Rollback failed:', error);
      throw error;
    }
  }
}
