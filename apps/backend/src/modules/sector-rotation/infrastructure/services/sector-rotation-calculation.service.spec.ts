import { DateRange } from '../../../market-data/domain/value-objects/date-range';
import { PricePoint } from '../../../market-data/domain/value-objects/price-point';
import { Symbol } from '../../../market-data/domain/value-objects/symbol';
import type {
  HistoricalData,
  MarketDataService,
} from '../../../market-data/domain/services/market-data.service';
import { RotationMember } from '../../domain/value-objects/rotation-member';
import { RotationUniverse } from '../../domain/value-objects/rotation-universe';
import { ZScoreNormalizer } from './z-score-normalizer.service';
import { BenchmarkCalculator } from './benchmark-calculator.service';
import { SectorRotationCalculationServiceImpl } from './sector-rotation-calculation.service';
import { RRG_PARAMETERS } from '../../constants/rrg-parameters';

const TECHNOLOGY = RotationMember.of('Technology', 'XLK');
const FINANCIAL = RotationMember.of('Financial', 'XLF');

function makeUniverse(members: RotationMember[]): RotationUniverse {
  return RotationUniverse.of({
    id: 'test-universe',
    label: 'Test Universe',
    members,
    benchmarkSymbol: 'SPY',
  });
}

/**
 * Build a deterministic weekly OHLC series with `weeks` Monday-anchored bars
 * starting at `startISO`. Each bar's close is `closes[i]`.
 */
function buildWeeklyPoints(startISO: string, closes: number[]): PricePoint[] {
  const start = new Date(startISO);
  // Snap to the Monday on/after startISO so WeekUtils treats it as the canonical
  // bar for that week regardless of input timezone offset.
  const day = start.getUTCDay();
  const daysToMonday = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  start.setUTCDate(start.getUTCDate() + daysToMonday);

  return closes.map((close, i) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + i * 7);
    // Ensure OHLC invariants hold without making the data look real.
    return PricePoint.of(date, close, close + 1, close - 1, close, 1000);
  });
}

function makeMarketDataService(
  pricesBySymbol: Record<string, PricePoint[]>,
): jest.Mocked<MarketDataService> {
  return {
    getHistoricalData: jest.fn(
      (symbol: Symbol, dateRange: DateRange): Promise<HistoricalData> => {
        const points = pricesBySymbol[symbol.value];
        if (!points) {
          return Promise.reject(new Error(`No mock data for ${symbol.value}`));
        }
        return Promise.resolve({ symbol, dateRange, pricePoints: points });
      },
    ),
  };
}

describe('SectorRotationCalculationServiceImpl', () => {
  // Number of weekly bars to mock — comfortably above the lookback floor.
  const TOTAL_WEEKS = 60;
  const START = '2024-01-01T00:00:00.000Z'; // Monday

  let service: SectorRotationCalculationServiceImpl;
  let marketData: jest.Mocked<MarketDataService>;
  let benchmark: BenchmarkCalculator;
  let zScore: ZScoreNormalizer;

  beforeEach(() => {
    zScore = new ZScoreNormalizer();
  });

  function buildService(
    pricesBySymbol: Record<string, PricePoint[]>,
  ): SectorRotationCalculationServiceImpl {
    marketData = makeMarketDataService(pricesBySymbol);
    benchmark = new BenchmarkCalculator(marketData);
    return new SectorRotationCalculationServiceImpl(
      marketData,
      zScore,
      benchmark,
    );
  }

  /**
   * Builds a price series where the sector ETF and the benchmark both follow
   * a stable trend, but the sector outperforms — guarantees deterministic,
   * finite x/y/RS values for the whole window.
   */
  function setupTrendingScenario(): {
    sectorPoints: PricePoint[];
    spyPoints: PricePoint[];
  } {
    const sectorCloses = Array.from(
      { length: TOTAL_WEEKS },
      (_, i) => 100 + i * 1.5,
    );
    const spyCloses = Array.from(
      { length: TOTAL_WEEKS },
      (_, i) => 100 + i * 1.0,
    );
    return {
      sectorPoints: buildWeeklyPoints(START, sectorCloses),
      spyPoints: buildWeeklyPoints(START, spyCloses),
    };
  }

  describe('calculate — input validation', () => {
    beforeEach(() => {
      const { sectorPoints, spyPoints } = setupTrendingScenario();
      service = buildService({
        XLK: sectorPoints,
        SPY: spyPoints,
      });
    });

    it('rejects an empty universe at construction time', () => {
      expect(() =>
        RotationUniverse.of({
          id: 'empty',
          label: 'Empty',
          members: [],
          benchmarkSymbol: 'SPY',
        }),
      ).toThrow('at least one member');
    });

    it('throws when momentumWeeks is below 1', async () => {
      const dr = DateRange.of(
        new Date('2024-06-01T00:00:00.000Z'),
        new Date('2024-09-01T00:00:00.000Z'),
      );
      await expect(
        service.calculate(makeUniverse([TECHNOLOGY]), dr, {
          momentumWeeks: 0,
          normalizationWindowWeeks: RRG_PARAMETERS.NORMALIZATION_WINDOW_WEEKS,
        }),
      ).rejects.toThrow('momentumWeeks must be at least 1');
    });

    it('throws when normalizationWindowWeeks is below 1', async () => {
      const dr = DateRange.of(
        new Date('2024-06-01T00:00:00.000Z'),
        new Date('2024-09-01T00:00:00.000Z'),
      );
      await expect(
        service.calculate(makeUniverse([TECHNOLOGY]), dr, {
          momentumWeeks: RRG_PARAMETERS.MOMENTUM_WEEKS,
          normalizationWindowWeeks: 0,
        }),
      ).rejects.toThrow('normalizationWindowWeeks must be at least 1');
    });
  });

  describe('calculate — happy path', () => {
    let sectorPoints: PricePoint[];
    let spyPoints: PricePoint[];

    beforeEach(() => {
      const scenario = setupTrendingScenario();
      sectorPoints = scenario.sectorPoints;
      spyPoints = scenario.spyPoints;
      service = buildService({
        XLK: sectorPoints,
        SPY: spyPoints,
      });
    });

    it('extends the fetch range backward to satisfy lookback requirements', async () => {
      const requestedStart = new Date('2024-09-02T00:00:00.000Z');
      const requestedEnd = new Date('2024-12-09T00:00:00.000Z');
      const dr = DateRange.of(requestedStart, requestedEnd);

      await service.calculate(makeUniverse([TECHNOLOGY]), dr, {
        momentumWeeks: RRG_PARAMETERS.MOMENTUM_WEEKS,
        normalizationWindowWeeks: RRG_PARAMETERS.NORMALIZATION_WINDOW_WEEKS,
      });

      // Calculation service extends the fetch window backward by max(normalization, momentum, smoothing) weeks.
      const expectedLookbackWeeks = Math.max(
        RRG_PARAMETERS.NORMALIZATION_WINDOW_WEEKS,
        RRG_PARAMETERS.MOMENTUM_WEEKS,
        RRG_PARAMETERS.RS_SMOOTHING_PERIOD,
      );

      // First fetch is for the sector ETF.
      const firstCall = marketData.getHistoricalData.mock.calls[0];
      const fetchedStart = firstCall[1].startDate;
      const expectedStart = new Date(requestedStart);
      expectedStart.setDate(
        expectedStart.getDate() - expectedLookbackWeeks * 7,
      );
      expect(fetchedStart.getTime()).toBe(expectedStart.getTime());
    });

    it('produces data points only within the requested range', async () => {
      const requestedStart = new Date('2024-09-02T00:00:00.000Z');
      const requestedEnd = new Date('2024-12-09T00:00:00.000Z');
      const dr = DateRange.of(requestedStart, requestedEnd);

      const result = await service.calculate(makeUniverse([TECHNOLOGY]), dr, {
        momentumWeeks: RRG_PARAMETERS.MOMENTUM_WEEKS,
        normalizationWindowWeeks: RRG_PARAMETERS.NORMALIZATION_WINDOW_WEEKS,
      });

      expect(result.dataPoints.length).toBeGreaterThan(0);
      for (const point of result.dataPoints) {
        expect(point.date.getTime()).toBeGreaterThanOrEqual(
          requestedStart.getTime(),
        );
        expect(point.date.getTime()).toBeLessThanOrEqual(
          requestedEnd.getTime(),
        );
      }
    });

    it('computes relative strength as 100 * (sectorPrice / benchmarkPrice)', async () => {
      const requestedStart = new Date('2024-09-02T00:00:00.000Z');
      const requestedEnd = new Date('2024-12-09T00:00:00.000Z');
      const dr = DateRange.of(requestedStart, requestedEnd);

      const result = await service.calculate(makeUniverse([TECHNOLOGY]), dr, {
        momentumWeeks: RRG_PARAMETERS.MOMENTUM_WEEKS,
        normalizationWindowWeeks: RRG_PARAMETERS.NORMALIZATION_WINDOW_WEEKS,
      });

      const sectorByDate = new Map(
        sectorPoints.map((p) => [p.date.getTime(), p.close]),
      );
      const spyByDate = new Map(
        spyPoints.map((p) => [p.date.getTime(), p.close]),
      );

      for (const point of result.dataPoints) {
        const sectorClose = sectorByDate.get(point.date.getTime());
        const spyClose = spyByDate.get(point.date.getTime());
        if (sectorClose === undefined || spyClose === undefined) {
          continue;
        }
        const expectedRS = 100 * (sectorClose / spyClose);
        expect(point.relativeStrength).toBeCloseTo(expectedRS, 5);
      }
    });

    it('assigns a quadrant consistent with the (x,y) coordinates', async () => {
      const dr = DateRange.of(
        new Date('2024-06-01T00:00:00.000Z'),
        new Date('2024-12-09T00:00:00.000Z'),
      );

      const result = await service.calculate(makeUniverse([TECHNOLOGY]), dr, {
        momentumWeeks: RRG_PARAMETERS.MOMENTUM_WEEKS,
        normalizationWindowWeeks: RRG_PARAMETERS.NORMALIZATION_WINDOW_WEEKS,
      });

      for (const point of result.dataPoints) {
        const x = point.x;
        const y = point.y;
        const q = point.quadrant.value;
        if (x > 100 && y > 100) {
          expect(q).toBe('Leading');
        } else if (x > 100 && y < 100) {
          expect(q).toBe('Weakening');
        } else if (x < 100 && y < 100) {
          expect(q).toBe('Lagging');
        } else {
          expect(q).toBe('Improving');
        }
      }
    });

    it('returns x/y values centered around 100 (JdK convention)', async () => {
      // For a steadily-trending RS line, the rolling z-score normalization
      // should keep x and y in a tight band around the center (100).
      const dr = DateRange.of(
        new Date('2024-06-01T00:00:00.000Z'),
        new Date('2024-12-09T00:00:00.000Z'),
      );

      const result = await service.calculate(makeUniverse([TECHNOLOGY]), dr, {
        momentumWeeks: RRG_PARAMETERS.MOMENTUM_WEEKS,
        normalizationWindowWeeks: RRG_PARAMETERS.NORMALIZATION_WINDOW_WEEKS,
      });

      for (const point of result.dataPoints) {
        // Z-score is clamped to ±3 std × 3 multiplier ⇒ x/y in [91, 109].
        // Allow a small numeric cushion.
        expect(point.x).toBeGreaterThan(80);
        expect(point.x).toBeLessThan(120);
        expect(point.y).toBeGreaterThan(80);
        expect(point.y).toBeLessThan(120);
      }
    });

    it('returns the result tagged with the input sector ETF symbols', async () => {
      const dr = DateRange.of(
        new Date('2024-06-01T00:00:00.000Z'),
        new Date('2024-12-09T00:00:00.000Z'),
      );

      const result = await service.calculate(makeUniverse([TECHNOLOGY]), dr, {
        momentumWeeks: RRG_PARAMETERS.MOMENTUM_WEEKS,
        normalizationWindowWeeks: RRG_PARAMETERS.NORMALIZATION_WINDOW_WEEKS,
      });

      expect(result.sectorSymbols).toEqual(['XLK']);
      for (const point of result.dataPoints) {
        expect(point.sectorSymbol).toBe('XLK');
      }
    });
  });

  describe('calculate — multi-sector fetch behavior', () => {
    it('tolerates partial fetch failures and continues with the available sectors', async () => {
      const { sectorPoints, spyPoints } = setupTrendingScenario();

      marketData = {
        getHistoricalData: jest.fn(
          (symbol: Symbol, dateRange: DateRange): Promise<HistoricalData> => {
            if (symbol.value === 'XLF') {
              return Promise.reject(new Error('Simulated upstream failure'));
            }
            const points = symbol.value === 'SPY' ? spyPoints : sectorPoints;
            return Promise.resolve({
              symbol,
              dateRange,
              pricePoints: points,
            });
          },
        ),
      };
      benchmark = new BenchmarkCalculator(marketData);
      service = new SectorRotationCalculationServiceImpl(
        marketData,
        zScore,
        benchmark,
      );

      const dr = DateRange.of(
        new Date('2024-06-01T00:00:00.000Z'),
        new Date('2024-12-09T00:00:00.000Z'),
      );

      const result = await service.calculate(
        makeUniverse([TECHNOLOGY, FINANCIAL]),
        dr,
        {
          momentumWeeks: RRG_PARAMETERS.MOMENTUM_WEEKS,
          normalizationWindowWeeks: RRG_PARAMETERS.NORMALIZATION_WINDOW_WEEKS,
        },
      );

      // XLF dropped, XLK survived. sectorSymbols reflects only what could
      // actually be computed, so downstream consumers don't see ghosts.
      expect(result.sectorSymbols).toEqual(['XLK']);
      const seenSymbols = new Set(result.dataPoints.map((p) => p.sectorSymbol));
      expect(seenSymbols.has('XLK')).toBe(true);
      expect(seenSymbols.has('XLF')).toBe(false);
    });

    it('throws when all sector fetches fail', async () => {
      marketData = {
        getHistoricalData: jest.fn(
          (symbol: Symbol, dateRange: DateRange): Promise<HistoricalData> => {
            if (symbol.value === 'SPY') {
              return Promise.resolve({
                symbol,
                dateRange,
                pricePoints: buildWeeklyPoints(
                  START,
                  Array.from({ length: TOTAL_WEEKS }, (_, i) => 100 + i * 1.0),
                ),
              });
            }
            return Promise.reject(new Error(`No data for ${symbol.value}`));
          },
        ),
      };
      benchmark = new BenchmarkCalculator(marketData);
      service = new SectorRotationCalculationServiceImpl(
        marketData,
        zScore,
        benchmark,
      );

      const dr = DateRange.of(
        new Date('2024-06-01T00:00:00.000Z'),
        new Date('2024-12-09T00:00:00.000Z'),
      );

      await expect(
        service.calculate(makeUniverse([TECHNOLOGY]), dr, {
          momentumWeeks: RRG_PARAMETERS.MOMENTUM_WEEKS,
          normalizationWindowWeeks: RRG_PARAMETERS.NORMALIZATION_WINDOW_WEEKS,
        }),
      ).rejects.toThrow('Failed to fetch data for all sectors');
    });
  });

  describe('calculate — insufficient data', () => {
    it('throws only when every sector lacks enough weekly bars', async () => {
      const tinySectorPoints = buildWeeklyPoints(
        START,
        Array.from({ length: 3 }, (_, i) => 100 + i),
      );
      const spyPoints = buildWeeklyPoints(
        START,
        Array.from({ length: TOTAL_WEEKS }, (_, i) => 100 + i * 1.0),
      );

      service = buildService({
        XLK: tinySectorPoints,
        SPY: spyPoints,
      });

      const dr = DateRange.of(
        new Date('2024-06-01T00:00:00.000Z'),
        new Date('2024-12-09T00:00:00.000Z'),
      );

      await expect(
        service.calculate(makeUniverse([TECHNOLOGY]), dr, {
          momentumWeeks: RRG_PARAMETERS.MOMENTUM_WEEKS,
          normalizationWindowWeeks: RRG_PARAMETERS.NORMALIZATION_WINDOW_WEEKS,
        }),
      ).rejects.toThrow(/No sectors have enough historical data/);
    });

    it('skips a single short sector and computes the rest', async () => {
      // XLK has plenty of data; XLF only has 3 weekly bars (way under the
      // lookback floor). Result should still come back, restricted to XLK,
      // rather than failing the whole call. Mirrors the real ^SP500-6020
      // case where one industry-group subindex is too new on Yahoo.
      const { sectorPoints, spyPoints } = setupTrendingScenario();
      const tinyPoints = buildWeeklyPoints(
        START,
        Array.from({ length: 3 }, (_, i) => 100 + i),
      );

      service = buildService({
        XLK: sectorPoints,
        XLF: tinyPoints,
        SPY: spyPoints,
      });

      const dr = DateRange.of(
        new Date('2024-06-01T00:00:00.000Z'),
        new Date('2024-12-09T00:00:00.000Z'),
      );

      const result = await service.calculate(
        makeUniverse([TECHNOLOGY, FINANCIAL]),
        dr,
        {
          momentumWeeks: RRG_PARAMETERS.MOMENTUM_WEEKS,
          normalizationWindowWeeks: RRG_PARAMETERS.NORMALIZATION_WINDOW_WEEKS,
        },
      );

      expect(result.sectorSymbols).toEqual(['XLK']);
      expect(result.dataPoints.every((p) => p.sectorSymbol === 'XLK')).toBe(
        true,
      );
    });
  });

  describe('calculate — no output points', () => {
    it('throws when the requested date range falls entirely outside the data window', async () => {
      const { sectorPoints, spyPoints } = setupTrendingScenario();
      service = buildService({
        XLK: sectorPoints,
        SPY: spyPoints,
      });

      // Data covers 2024-01-01 forward. Request a range strictly before that.
      const dr = DateRange.of(
        new Date('2023-06-01T00:00:00.000Z'),
        new Date('2023-09-01T00:00:00.000Z'),
      );

      await expect(
        service.calculate(makeUniverse([TECHNOLOGY]), dr, {
          momentumWeeks: RRG_PARAMETERS.MOMENTUM_WEEKS,
          normalizationWindowWeeks: RRG_PARAMETERS.NORMALIZATION_WINDOW_WEEKS,
        }),
      ).rejects.toThrow(/No data points generated/);
    });
  });
  beforeAll(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
});
