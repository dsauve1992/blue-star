import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from './config/database.service';
import { MigrationService } from './config/migration.service';

describe('AppController', () => {
  let appController: AppController;
  let databaseService: { query: jest.Mock };
  let migrationService: { startupFailure: jest.Mock };

  beforeEach(async () => {
    databaseService = { query: jest.fn() };
    migrationService = { startupFailure: jest.fn() };
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: DatabaseService, useValue: databaseService },
        { provide: MigrationService, useValue: migrationService },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('should report ok when the database answers', async () => {
      databaseService.query.mockResolvedValue({ rows: [] });

      await expect(appController.getHealth()).resolves.toMatchObject({
        status: 'ok',
      });
      expect(databaseService.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should throw ServiceUnavailableException when a startup migration failed', async () => {
      migrationService.startupFailure.mockReturnValue('relation exists');
      databaseService.query.mockResolvedValue({ rows: [] });

      const result = appController.getHealth();

      await expect(result).rejects.toThrow(ServiceUnavailableException);
      await expect(result).rejects.toThrow('Startup migrations failed');
    });

    it('should throw ServiceUnavailableException when the recorded failure message is empty', async () => {
      migrationService.startupFailure.mockReturnValue('');
      databaseService.query.mockResolvedValue({ rows: [] });

      await expect(appController.getHealth()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw ServiceUnavailableException when the query fails', async () => {
      databaseService.query.mockRejectedValue(new Error('connection refused'));

      await expect(appController.getHealth()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw ServiceUnavailableException when the query never settles', async () => {
      jest.useFakeTimers();
      try {
        databaseService.query.mockReturnValue(new Promise(() => undefined));

        const result = appController.getHealth();
        const assertion = expect(result).rejects.toThrow(
          ServiceUnavailableException,
        );
        await jest.advanceTimersByTimeAsync(3000);

        await assertion;
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
