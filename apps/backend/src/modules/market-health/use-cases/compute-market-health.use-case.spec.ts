import { ComputeMarketHealthUseCase } from './compute-market-health.use-case';
import type { MarketDataService } from '../../market-data/domain/services/market-data.service';
import type { MarketHealthRepository } from '../domain/repositories/market-health.repository.interface';
import type { MarketHealth } from '../domain/entities/market-health.entity';
import { MarketHealthStatusValue } from '../domain/value-objects/market-health-status';
import { PricePoint } from '../../market-data/domain/value-objects/price-point';

describe('ComputeMarketHealthUseCase', () => {
  let useCase: ComputeMarketHealthUseCase;
  let marketDataService: jest.Mocked<MarketDataService>;
  let marketHealthRepository: jest.Mocked<MarketHealthRepository>;

  const rising = Array.from({ length: 30 }, (_, i) => 100 + i);
  const falling = Array.from({ length: 30 }, (_, i) => 130 - i);
  const risingThenDip = [...rising.slice(0, 29), 120];

  function pricePointsFrom(closes: number[]): PricePoint[] {
    return closes.map((close, i) =>
      PricePoint.of(
        new Date(Date.UTC(2026, 0, 1 + i)),
        close,
        close,
        close,
        close,
        1000,
      ),
    );
  }

  function givenCloses(closes: number[]) {
    marketDataService.getHistoricalData.mockResolvedValue({
      pricePoints: pricePointsFrom(closes),
    } as never);
  }

  function savedHealth(): MarketHealth {
    return marketHealthRepository.save.mock.calls[0][0];
  }

  beforeEach(() => {
    marketDataService = { getHistoricalData: jest.fn() };
    marketHealthRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findLatest: jest.fn(),
    };
    useCase = new ComputeMarketHealthUseCase(
      marketDataService,
      marketHealthRepository,
    );
  });

  it('saves and returns GOOD when EMA9 is above EMA21 and both are rising', async () => {
    givenCloses(rising);

    const result = await useCase.execute();

    expect(result.status.value).toBe(MarketHealthStatusValue.GOOD);
    expect(savedHealth()).toBe(result);
  });

  it('saves WARNING when EMA9 is above EMA21 but EMA9 is falling', async () => {
    givenCloses(risingThenDip);

    await useCase.execute();

    const health = savedHealth();
    expect(health.status.value).toBe(MarketHealthStatusValue.WARNING);
    expect(health.ema9).toBeGreaterThan(health.ema21);
  });

  it('saves BAD when EMA9 is at or below EMA21', async () => {
    givenCloses(falling);

    await useCase.execute();

    expect(savedHealth().status.value).toBe(MarketHealthStatusValue.BAD);
  });

  it('throws and saves nothing with fewer than 22 price points', async () => {
    givenCloses(rising.slice(0, 21));

    await expect(useCase.execute()).rejects.toThrow(
      new Error('Not enough data points to compute EMAs: 21'),
    );

    expect(marketHealthRepository.save).not.toHaveBeenCalled();
  });

  it('computes from 22 price points', async () => {
    givenCloses(rising.slice(0, 22));

    await useCase.execute();

    expect(marketHealthRepository.save).toHaveBeenCalledTimes(1);
  });

  it('throws and saves nothing when market data fails', async () => {
    const error = new Error('boom');
    marketDataService.getHistoricalData.mockRejectedValue(error);

    await expect(useCase.execute()).rejects.toBe(error);

    expect(marketHealthRepository.save).not.toHaveBeenCalled();
  });

  it('gives the same result for unsorted price points', async () => {
    givenCloses(rising);
    await useCase.execute();
    const sortedResult = savedHealth();

    marketHealthRepository.save.mockClear();
    marketDataService.getHistoricalData.mockResolvedValue({
      pricePoints: pricePointsFrom(rising).reverse(),
    } as never);
    await useCase.execute();

    expect(savedHealth().status.value).toBe(sortedResult.status.value);
    expect(savedHealth().ema9).toBe(sortedResult.ema9);
    expect(savedHealth().ema21).toBe(sortedResult.ema21);
  });

  it('does not mutate the order of the market data price points', async () => {
    const pricePoints = pricePointsFrom(rising).reverse();
    const originalOrder = [...pricePoints];
    marketDataService.getHistoricalData.mockResolvedValue({
      pricePoints,
    } as never);

    await useCase.execute();

    expect(pricePoints).toEqual(originalOrder);
  });

  it('rounds the saved EMAs to 4 decimals', async () => {
    givenCloses(rising.map((close) => close + 1 / 3));

    await useCase.execute();

    const { ema9, ema21 } = savedHealth();
    expect(Math.round(ema9 * 10000) / 10000).toBe(ema9);
    expect(Math.round(ema21 * 10000) / 10000).toBe(ema21);
  });
});
