import { ConfigService } from '@nestjs/config';

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
  connectionString: string;
}

export const getDatabaseConfig = (
  configService: ConfigService,
): DatabaseConfig => {
  const host = configService.get<string>('DB_HOST', 'localhost');
  const port = configService.get<number>('DB_PORT', 5432);
  const username = configService.get<string>('DB_USERNAME', 'blue_star_user');
  const password = configService.get<string>(
    'DB_PASSWORD',
    'blue_star_password',
  );
  const database = configService.get<string>('DB_DATABASE', 'blue_star_db');
  const ssl = configService.get<boolean>('DB_SSL', false);

  // Support both individual config and DATABASE_URL
  const databaseUrl = configService.get<string>('DATABASE_URL');

  if (databaseUrl) {
    const url = new URL(databaseUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      username: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading slash
      ssl: url.protocol === 'postgresql:',
      connectionString: databaseUrl,
    };
  }

  const connectionString = `postgresql://${username}:${password}@${host}:${port}/${database}`;

  return {
    host,
    port,
    username,
    password,
    database,
    ssl,
    connectionString,
  };
};

