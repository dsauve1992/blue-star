import { CompareSectorRotationUseCase } from './compare-sector-rotation.use-case';
import type { SectorRotationCalculationService } from '../domain/services/sector-rotation-calculation.service';
import type { SectorRotationPersistenceService } from '../domain/services/sector-rotation-persistence.service';
import { SectorRotationDataPoint } from '../domain/value-objects/sector-rotation-data-point';
import { SectorRotationResult } from '../domain/value-objects/sector-rotation-result';
import { Quadrant } from '../domain/value-objects/quadrant';
import { RotationUniverseRegistry } from '../infrastructure/universes/rotation-universe.registry';

describe('CompareSectorRotationUseCase', () => {
  const startDate = new Date('2026-06-01');
  const endDate = new Date('2026-06-30');
  const sectors = [{ symbol: 'XLK', name: 'Technology' }];

  let useCase: CompareSectorRotationUseCase;
  let calculationService: jest.Mocked<SectorRotationCalculationService>;
  let persistenceService: jest.Mocked<SectorRotationPersistenceService>;

  beforeEach(() => {
    calculationService = { calculate: jest.fn() };
    persistenceService = {
      getOrCompute: jest.fn(),
    } as unknown as jest.Mocked<SectorRotationPersistenceService>;
    useCase = new CompareSectorRotationUseCase(
      calculationService,
      persistenceService,
      new RotationUniverseRegistry(),
    );
  });

  function point(date: string, x = 100, y = 100): SectorRotationDataPoint {
    return SectorRotationDataPoint.of(
      new Date(date),
      'XLK',
      100,
      105,
      x,
      y,
      Quadrant.Leading,
    );
  }

  function result(points: SectorRotationDataPoint[]): SectorRotationResult {
    return SectorRotationResult.of(startDate, endDate, points, ['XLK']);
  }

  function arrange(
    persisted: SectorRotationDataPoint[],
    live: SectorRotationDataPoint[],
  ): void {
    persistenceService.getOrCompute.mockResolvedValue(result(persisted));
    calculationService.calculate.mockResolvedValue(result(live));
  }

  function compare() {
    return useCase.execute({ sectors, startDate, endDate });
  }

  it('counts identical persisted and live points as matching', async () => {
    arrange(
      [point('2026-06-05'), point('2026-06-12')],
      [point('2026-06-05'), point('2026-06-12')],
    );

    const { summary } = await compare();

    expect(summary.totalDataPoints).toBe(2);
    expect(summary.matchingDataPoints).toBe(2);
    expect(summary.differentDataPoints).toBe(0);
  });

  it('counts a point whose delta exceeds the tolerance as different and records the max difference', async () => {
    arrange([point('2026-06-05', 100, 100)], [point('2026-06-05', 101, 100)]);

    const { summary } = await compare();

    expect(summary.matchingDataPoints).toBe(0);
    expect(summary.differentDataPoints).toBe(1);
    expect(summary.maxDifference.x).toBeCloseTo(1);
    expect(summary.maxDifference.y).toBe(0);
  });

  it('counts points present on only one side as different', async () => {
    arrange(
      [point('2026-06-05'), point('2026-06-12')],
      [point('2026-06-05'), point('2026-06-19')],
    );

    const { summary, differences } = await compare();

    expect(summary.totalDataPoints).toBe(3);
    expect(summary.matchingDataPoints).toBe(1);
    expect(summary.differentDataPoints).toBe(2);
    expect(summary.matchingDataPoints + summary.differentDataPoints).toBe(
      summary.totalDataPoints,
    );
    expect(differences.find((d) => d.date === '2026-06-12')?.live).toBeNull();
    expect(
      differences.find((d) => d.date === '2026-06-19')?.persisted,
    ).toBeNull();
  });

  it('excludes live points outside the requested range', async () => {
    arrange(
      [point('2026-06-05')],
      [point('2026-05-29'), point('2026-06-05'), point('2026-07-03')],
    );

    const { live, differences, summary } = await compare();

    expect(live.dataPoints).toHaveLength(1);
    expect(differences.map((d) => d.date)).toEqual(['2026-06-05']);
    expect(summary.totalDataPoints).toBe(1);
  });
});
