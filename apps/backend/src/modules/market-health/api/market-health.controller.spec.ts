import { NotFoundException } from '@nestjs/common';
import { MarketHealthController } from './market-health.controller';
import { MarketHealthApiMapper } from './market-health-api.mapper';
import type { GetMarketHealthUseCase } from '../use-cases/get-market-health.use-case';
import type { ComputeMarketHealthUseCase } from '../use-cases/compute-market-health.use-case';
import { MarketHealth } from '../domain/entities/market-health.entity';
import { MarketHealthStatus } from '../domain/value-objects/market-health-status';

describe('MarketHealthController', () => {
  let getUseCase: jest.Mocked<GetMarketHealthUseCase>;
  let computeUseCase: jest.Mocked<ComputeMarketHealthUseCase>;
  let controller: MarketHealthController;

  beforeEach(() => {
    getUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetMarketHealthUseCase>;
    computeUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ComputeMarketHealthUseCase>;
    controller = new MarketHealthController(
      getUseCase,
      new MarketHealthApiMapper(),
      computeUseCase,
    );
  });

  it('returns the mapped market health from GET', async () => {
    const computedAt = new Date('2026-10-09T12:00:00.000Z');
    getUseCase.execute.mockResolvedValue(
      MarketHealth.create({
        id: 'id',
        status: MarketHealthStatus.warning(),
        ema9: 101.5,
        ema21: 100.25,
        computedAt,
      }),
    );

    await expect(controller.getMarketHealth()).resolves.toEqual({
      status: 'WARNING',
      ema9: 101.5,
      ema21: 100.25,
      computedAt: '2026-10-09T12:00:00.000Z',
    });
  });

  it('throws NotFoundException from GET when no market health is computed yet', async () => {
    getUseCase.execute.mockResolvedValue(null);

    await expect(controller.getMarketHealth()).rejects.toBeInstanceOf(
      NotFoundException,
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
