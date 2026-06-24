import { Test, TestingModule } from '@nestjs/testing';
import { GapContextServiceImpl } from './gap-context.service';
import { WatchlistTicker } from '../../../watchlist/domain/value-objects/watchlist-ticker';
import { STOCK_CLASSIFICATION_REPOSITORY } from '../../../stock-classification/constants/tokens';
import type { StockClassificationRepository } from '../../../stock-classification/domain/repositories/stock-classification.repository.interface';
import { StockClassification } from '../../../stock-classification/domain/entities/stock-classification.entity';
import {
  RS_RATING_REPOSITORY,
  INDUSTRY_GROUP_RS_RATING_REPOSITORY,
} from '../../../stock-analysis/constants/tokens';
import type { RsRatingRepository } from '../../../stock-analysis/domain/repositories/rs-rating.repository.interface';
import type { IndustryGroupRsRatingRepository } from '../../../stock-analysis/domain/repositories/industry-group-rs-rating.repository.interface';
import { RsRating } from '../../../stock-analysis/domain/value-objects/rs-rating';
import { IndustryGroupRsRating } from '../../../stock-analysis/domain/value-objects/industry-group-rs-rating';
import { SECTOR_ROTATION_DATA_READ_REPOSITORY } from '../../../sector-rotation/constants/tokens';
import type { SectorRotationDataReadRepository } from '../../../sector-rotation/domain/repositories/sector-rotation-data-read.repository.interface';
import { SectorRotationDataPoint } from '../../../sector-rotation/domain/value-objects/sector-rotation-data-point';
import { Quadrant } from '../../../sector-rotation/domain/value-objects/quadrant';
import { RotationUniverseRegistry } from '../../../sector-rotation/infrastructure/universes/rotation-universe.registry';
import { GICS_INDUSTRY_GROUP_UNIVERSE_ID } from '../../../sector-rotation/infrastructure/universes/gics-industry-group.universe';

describe('GapContextServiceImpl', () => {
  let service: GapContextServiceImpl;
  let classificationRepository: jest.Mocked<StockClassificationRepository>;
  let rsRatingRepository: jest.Mocked<RsRatingRepository>;
  let industryGroupRsRatingRepository: jest.Mocked<IndustryGroupRsRatingRepository>;
  let sectorRotationRepository: jest.Mocked<SectorRotationDataReadRepository>;

  const ticker = WatchlistTicker.of('NASDAQ:NVDA');

  beforeEach(async () => {
    classificationRepository = {
      findByTicker: jest.fn(),
      save: jest.fn(),
      findGroupsForTickers: jest.fn(),
    };
    rsRatingRepository = {
      saveRatings: jest.fn(),
      getLatestRatings: jest.fn(),
      getLatestRating: jest.fn(),
      getAllForLatestDate: jest.fn(),
    };
    industryGroupRsRatingRepository = {
      saveRatings: jest.fn(),
      getLatestRatings: jest.fn(),
      getLatestRating: jest.fn(),
      listLatestGroups: jest.fn(),
      getLatestRatingsByGroup: jest.fn(),
    };
    sectorRotationRepository = {
      findByDateRange: jest.fn(),
      findBySectorAndDateRange: jest.fn(),
      findLatestDate: jest.fn(),
      findLatestDateBySector: jest.fn(),
      findLatestBySector: jest.fn(),
      findExistingDates: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GapContextServiceImpl,
        RotationUniverseRegistry,
        {
          provide: STOCK_CLASSIFICATION_REPOSITORY,
          useValue: classificationRepository,
        },
        { provide: RS_RATING_REPOSITORY, useValue: rsRatingRepository },
        {
          provide: INDUSTRY_GROUP_RS_RATING_REPOSITORY,
          useValue: industryGroupRsRatingRepository,
        },
        {
          provide: SECTOR_ROTATION_DATA_READ_REPOSITORY,
          useValue: sectorRotationRepository,
        },
      ],
    }).compile();

    service = module.get(GapContextServiceImpl);
  });

  function classification(industryGroup: string | null): StockClassification {
    return StockClassification.create({
      ticker: 'NVDA',
      sector: 'Information Technology',
      industry: 'Semiconductors',
      industryKey: 'semiconductors',
      industryGroup,
    });
  }

  function rsRating(value: number): RsRating {
    return RsRating.of({
      symbol: 'NVDA',
      rsRating: value,
      weightedScore: 1,
      computedAt: new Date('2026-06-20'),
    });
  }

  function industryGroupRsRating(value: number): IndustryGroupRsRating {
    return IndustryGroupRsRating.of({
      symbol: 'NVDA',
      industryGroup: 'Semiconductors & Semiconductor Equipment',
      rsRating: value,
      weightedScore: 1,
      groupSize: 25,
      computedAt: new Date('2026-06-20'),
    });
  }

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

  it('resolves all four context fields and joins industry group to its subindex quadrant', async () => {
    classificationRepository.findByTicker.mockResolvedValue(
      classification('Semiconductors & Semiconductor Equipment'),
    );
    rsRatingRepository.getLatestRating.mockResolvedValue(rsRating(97));
    industryGroupRsRatingRepository.getLatestRating.mockResolvedValue(
      industryGroupRsRating(88),
    );
    sectorRotationRepository.findLatestBySector.mockResolvedValue(
      dataPoint(Quadrant.Leading),
    );

    const context = await service.enrich(ticker);

    expect(context.industryGroup).toBe(
      'Semiconductors & Semiconductor Equipment',
    );
    expect(context.globalRsRating).toBe(97);
    expect(context.industryGroupRsRating).toBe(88);
    expect(context.industryGroupQuadrant).toBe('Leading');

    // the quadrant lookup must use the subindex symbol for the group name
    expect(sectorRotationRepository.findLatestBySector).toHaveBeenCalledWith(
      GICS_INDUSTRY_GROUP_UNIVERSE_ID,
      '^SP500-4530',
    );
    // lookups are keyed by the bare symbol, exchange prefix stripped
    expect(rsRatingRepository.getLatestRating).toHaveBeenCalledWith('NVDA');
  });

  it('nulls the quadrant but keeps other fields when no industry group is classified', async () => {
    classificationRepository.findByTicker.mockResolvedValue(
      classification(null),
    );
    rsRatingRepository.getLatestRating.mockResolvedValue(rsRating(97));
    industryGroupRsRatingRepository.getLatestRating.mockResolvedValue(null);

    const context = await service.enrich(ticker);

    expect(context.industryGroup).toBeNull();
    expect(context.globalRsRating).toBe(97);
    expect(context.industryGroupRsRating).toBeNull();
    expect(context.industryGroupQuadrant).toBeNull();
    expect(sectorRotationRepository.findLatestBySector).not.toHaveBeenCalled();
  });

  it('nulls the quadrant when the industry group has no rotation universe member', async () => {
    classificationRepository.findByTicker.mockResolvedValue(
      classification('Not A Real Group'),
    );
    rsRatingRepository.getLatestRating.mockResolvedValue(rsRating(50));
    industryGroupRsRatingRepository.getLatestRating.mockResolvedValue(null);

    const context = await service.enrich(ticker);

    expect(context.industryGroup).toBe('Not A Real Group');
    expect(context.industryGroupQuadrant).toBeNull();
    expect(sectorRotationRepository.findLatestBySector).not.toHaveBeenCalled();
  });

  it('nulls the quadrant when no rotation data point exists for the subindex yet', async () => {
    classificationRepository.findByTicker.mockResolvedValue(
      classification('Banks'),
    );
    rsRatingRepository.getLatestRating.mockResolvedValue(null);
    industryGroupRsRatingRepository.getLatestRating.mockResolvedValue(null);
    sectorRotationRepository.findLatestBySector.mockResolvedValue(null);

    const context = await service.enrich(ticker);

    expect(context.industryGroupQuadrant).toBeNull();
    expect(sectorRotationRepository.findLatestBySector).toHaveBeenCalledWith(
      GICS_INDUSTRY_GROUP_UNIVERSE_ID,
      '^SP500-4010',
    );
  });

  it('is best-effort: a failing repository nulls only its own field', async () => {
    classificationRepository.findByTicker.mockResolvedValue(
      classification('Banks'),
    );
    rsRatingRepository.getLatestRating.mockRejectedValue(new Error('db down'));
    industryGroupRsRatingRepository.getLatestRating.mockResolvedValue(
      industryGroupRsRating(70),
    );
    sectorRotationRepository.findLatestBySector.mockResolvedValue(
      dataPoint(Quadrant.Improving),
    );

    const context = await service.enrich(ticker);

    expect(context.industryGroup).toBe('Banks');
    expect(context.globalRsRating).toBeNull();
    expect(context.industryGroupRsRating).toBe(70);
    expect(context.industryGroupQuadrant).toBe('Improving');
  });

  it('returns an empty context when every lookup misses', async () => {
    classificationRepository.findByTicker.mockResolvedValue(null);
    rsRatingRepository.getLatestRating.mockResolvedValue(null);
    industryGroupRsRatingRepository.getLatestRating.mockResolvedValue(null);

    const context = await service.enrich(ticker);

    expect(context.industryGroup).toBeNull();
    expect(context.globalRsRating).toBeNull();
    expect(context.industryGroupRsRating).toBeNull();
    expect(context.industryGroupQuadrant).toBeNull();
  });
});
