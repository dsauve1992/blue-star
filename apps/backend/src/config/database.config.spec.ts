import type { ConfigService } from '@nestjs/config';
import { getDatabaseConfig } from './database.config';

describe('getDatabaseConfig', () => {
  const buildConfig = (env: Record<string, string> = {}) =>
    ({
      get: (key: string, defaultValue?: unknown) => env[key] ?? defaultValue,
    }) as unknown as ConfigService;

  it('enables ssl when DB_SSL is "true"', () => {
    expect(getDatabaseConfig(buildConfig({ DB_SSL: 'true' })).ssl).toBe(true);
  });

  it('disables ssl when DB_SSL is "false"', () => {
    expect(getDatabaseConfig(buildConfig({ DB_SSL: 'false' })).ssl).toBe(false);
  });

  it('disables ssl when DB_SSL is unset', () => {
    expect(getDatabaseConfig(buildConfig()).ssl).toBe(false);
  });
});
