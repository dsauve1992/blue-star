import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { MigrationService } from './migration.service';

jest.mock('child_process', () => ({ exec: jest.fn() }));

describe('MigrationService', () => {
  const originalEnv = process.env;
  const execMock = exec as unknown as jest.Mock;
  let execEnv: NodeJS.ProcessEnv | undefined;

  const createService = (dbSsl: string) =>
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
    );

  const runMigrations = (dbSsl: string) => createService(dbSsl).runMigrations();

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
    expect(process.env.DB_SSL).toBe('false');
  });

  it("sets DB_SSL to 'no-verify' for db-migrate when ssl is enabled", async () => {
    process.env.DB_SSL = 'true';

    await runMigrations('true');

    expect(execEnv?.DB_SSL).toBe('no-verify');
    expect(process.env.DB_SSL).toBe('true');
  });

  it('leaves the startup failure undefined after a successful run', async () => {
    const service = createService('false');

    await service.runMigrations();

    expect(service.startupFailure()).toBeUndefined();
  });

  it('records the startup failure when a run fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    execMock.mockImplementation(
      (_command: string, _options: unknown, callback: (error: Error) => void) =>
        callback(new Error('relation already exists')),
    );
    const service = createService('false');

    await expect(service.runMigrations()).rejects.toThrow(
      'relation already exists',
    );

    expect(service.startupFailure()).toBe('relation already exists');
  });
});
