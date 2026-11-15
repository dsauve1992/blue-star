import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { MigrationService } from './migration.service';

jest.mock('child_process', () => ({ exec: jest.fn() }));

describe('MigrationService', () => {
  const originalEnv = process.env;
  const execMock = exec as unknown as jest.Mock;
  let execEnv: NodeJS.ProcessEnv | undefined;

  const runMigrations = (dbSsl: string) =>
    new MigrationService(
      new ConfigService({
        NODE_ENV: 'production',
        DB_HOST: 'db',
        DB_PORT: '5432',
        DB_USERNAME: 'user',
        DB_PASSWORD: 'pass',
        DB_DATABASE: 'blue_star_db',
        DB_SSL: dbSsl,
      }),
    ).runMigrations();

  beforeEach(() => {
    process.env = { ...originalEnv };
    execEnv = undefined;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    execMock.mockImplementation(
      (
        _command: string,
        options: { env: NodeJS.ProcessEnv },
        callback: (
          error: null,
          result: { stdout: string; stderr: string },
        ) => void,
      ) => {
        execEnv = { ...options.env };
        callback(null, { stdout: '', stderr: '' });
      },
    );
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('leaves DB_SSL unset for db-migrate when ssl is disabled', async () => {
    process.env.DB_SSL = 'false';

    await runMigrations('false');

    expect(execEnv).toBeDefined();
    expect(execEnv).not.toHaveProperty('DB_SSL');
  });

  it("sets DB_SSL to 'true' for db-migrate when ssl is enabled", async () => {
    await runMigrations('true');

    expect(execEnv?.DB_SSL).toBe('true');
  });
});
