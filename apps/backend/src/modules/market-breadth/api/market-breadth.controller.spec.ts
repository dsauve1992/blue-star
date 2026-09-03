import { BadRequestException } from '@nestjs/common';
import { MarketBreadthController } from './market-breadth.controller';
import { QueryMarketBreadthUseCase } from '../use-cases/query-market-breadth.use-case';
import { RunMarketBreadthUseCase } from '../use-cases/run-market-breadth.use-case';

describe('MarketBreadthController', () => {
  let queryUseCase: jest.Mocked<QueryMarketBreadthUseCase>;
  let runUseCase: jest.Mocked<RunMarketBreadthUseCase>;
  let controller: MarketBreadthController;

  beforeEach(() => {
    queryUseCase = {
      execute: jest.fn().mockResolvedValue({ sessions: [] }),
    } as unknown as jest.Mocked<QueryMarketBreadthUseCase>;
    runUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<RunMarketBreadthUseCase>;
    controller = new MarketBreadthController(queryUseCase, runUseCase);
  });

  it('defaults when no limit is given', async () => {
    await controller.history();
    expect(queryUseCase.execute).toHaveBeenCalledWith();
  });

  it('passes through a valid positive integer limit', async () => {
    await controller.history('10');
    expect(queryUseCase.execute).toHaveBeenCalledWith(10);
  });

  it.each([
    '0',
    '-1',
    'abc',
    '12abc',
    '1.5',
    '',
    '99999999999999999999',
    '10001',
  ])('rejects an invalid limit %s with 400', async (limit) => {
    await expect(controller.history(limit)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('accepts the maximum allowed limit', async () => {
    await controller.history('10000');
    expect(queryUseCase.execute).toHaveBeenCalledWith(10000);
  });
});
