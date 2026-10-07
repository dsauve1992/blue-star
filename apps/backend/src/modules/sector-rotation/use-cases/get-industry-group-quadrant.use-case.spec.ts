import { GetIndustryGroupQuadrantUseCase } from './get-industry-group-quadrant.use-case';
import type { SectorRotationDataReadRepository } from '../domain/repositories/sector-rotation-data-read.repository.interface';
import { SectorRotationDataPoint } from '../domain/value-objects/sector-rotation-data-point';
import { Quadrant } from '../domain/value-objects/quadrant';
import { RotationUniverseRegistry } from '../infrastructure/universes/rotation-universe.registry';
import { GICS_INDUSTRY_GROUP_UNIVERSE_ID } from '../infrastructure/universes/gics-industry-group.universe';

describe('GetIndustryGroupQuadrantUseCase', () => {
  let useCase: GetIndustryGroupQuadrantUseCase;
  let repository: jest.Mocked<SectorRotationDataReadRepository>;

  beforeEach(() => {
    repository = {
      findByDateRange: jest.fn(),
      findBySectorAndDateRange: jest.fn(),
      findLatestDate: jest.fn(),
      findLatestDateBySector: jest.fn(),
      findLatestBySector: jest.fn(),
      findExistingDates: jest.fn(),
    };
    useCase = new GetIndustryGroupQuadrantUseCase(
      repository,
      new RotationUniverseRegistry(),
    );
  });

  function dataPoint(quadrant: Quadrant): SectorRotationDataPoint {
    return SectorRotationDataPoint.of(
      new Date('2026-06-20'),
      '^SP500-4530',
      100,
      105,
      110,
      108,
      quadrant,
    );
  }

  it('returns the latest quadrant of the subindex matching the industry group name', async () => {
    repository.findLatestBySector.mockResolvedValue(
      dataPoint(Quadrant.Leading),
    );

    const quadrant = await useCase.execute(
      'Semiconductors & Semiconductor Equipment',
    );

    expect(quadrant).toBe('Leading');
    expect(repository.findLatestBySector).toHaveBeenCalledWith(
      GICS_INDUSTRY_GROUP_UNIVERSE_ID,
      '^SP500-4530',
    );
  });

  it('returns null without querying the repository for an unknown industry group', async () => {
    const quadrant = await useCase.execute('Not A Real Group');

    expect(quadrant).toBeNull();
    expect(repository.findLatestBySector).not.toHaveBeenCalled();
  });

  it('returns null when no rotation data point exists for the subindex yet', async () => {
    repository.findLatestBySector.mockResolvedValue(null);

    expect(await useCase.execute('Banks')).toBeNull();
  });
});
