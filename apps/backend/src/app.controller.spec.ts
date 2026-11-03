import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from './config/database.service';

describe('AppController', () => {
  let appController: AppController;
  let databaseService: { query: jest.Mock };

  beforeEach(async () => {
    databaseService = { query: jest.fn() };
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: DatabaseService, useValue: databaseService },
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

    it('should throw ServiceUnavailableException when the query fails', async () => {
      databaseService.query.mockRejectedValue(new Error('connection refused'));

      await expect(appController.getHealth()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });
});
