import { MarketHealthController } from './market-health.controller';
import { MarketHealthApiMapper } from './market-health-api.mapper';
import type { GetMarketHealthUseCase } from '../use-cases/get-market-health.use-case';
import type { ComputeMarketHealthUseCase } from '../use-cases/compute-market-health.use-case';
import { MarketHealth } from '../domain/entities/market-health.entity';
import { MarketHealthStatus } from '../domain/value-objects/market-health-status';

describe('MarketHealthController', () => {
  let computeUseCase: jest.Mocked<ComputeMarketHealthUseCase>;
  let controller: MarketHealthController;

  beforeEach(() => {
    computeUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ComputeMarketHealthUseCase>;
    controller = new MarketHealthController(
      {} as GetMarketHealthUseCase,
      new MarketHealthApiMapper(),
      computeUseCase,
    );
  });

  it('returns the mapped market health from POST compute', async () => {
    const computedAt = new Date('2026-10-09T12:00:00.000Z');
    computeUseCase.execute.mockResolvedValue(
      MarketHealth.create({
        id: 'id',
        status: MarketHealthStatus.warning(),
        ema9: 101.5,
        ema21: 100.25,
        computedAt,
      }),
    );

    await expect(controller.triggerComputation()).resolves.toEqual({
      status: 'WARNING',
      ema9: 101.5,
      ema21: 100.25,
      computedAt: '2026-10-09T12:00:00.000Z',
    });
  });

  it('propagates a computation failure from POST compute', async () => {
    const error = new Error('boom');
    computeUseCase.execute.mockRejectedValue(error);

    await expect(controller.triggerComputation()).rejects.toBe(error);
  });
});
