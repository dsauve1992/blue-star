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
import { GetIndustryGroupQuadrantUseCase } from '../../../sector-rotation/use-cases/get-industry-group-quadrant.use-case';

describe('GapContextServiceImpl', () => {
  let service: GapContextServiceImpl;
  let classificationRepository: jest.Mocked<StockClassificationRepository>;
  let rsRatingRepository: jest.Mocked<RsRatingRepository>;
  let industryGroupRsRatingRepository: jest.Mocked<IndustryGroupRsRatingRepository>;
  let getIndustryGroupQuadrant: jest.Mocked<GetIndustryGroupQuadrantUseCase>;

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
    getIndustryGroupQuadrant = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetIndustryGroupQuadrantUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GapContextServiceImpl,
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
          provide: GetIndustryGroupQuadrantUseCase,
          useValue: getIndustryGroupQuadrant,
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

  it('resolves all four context fields and joins industry group to its subindex quadrant', async () => {
    classificationRepository.findByTicker.mockResolvedValue(
      classification('Semiconductors & Semiconductor Equipment'),
    );
    rsRatingRepository.getLatestRating.mockResolvedValue(rsRating(97));
    industryGroupRsRatingRepository.getLatestRating.mockResolvedValue(
      industryGroupRsRating(88),
    );
    getIndustryGroupQuadrant.execute.mockResolvedValue('Leading');

    const context = await service.enrich(ticker);

    expect(context.industryGroup).toBe(
      'Semiconductors & Semiconductor Equipment',
    );
    expect(context.globalRsRating).toBe(97);
    expect(context.industryGroupRsRating).toBe(88);
    expect(context.industryGroupQuadrant).toBe('Leading');

    expect(getIndustryGroupQuadrant.execute).toHaveBeenCalledWith(
      'Semiconductors & Semiconductor Equipment',
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
    expect(getIndustryGroupQuadrant.execute).not.toHaveBeenCalled();
  });

  it('nulls the quadrant when the use case finds none', async () => {
    classificationRepository.findByTicker.mockResolvedValue(
      classification('Banks'),
    );
    rsRatingRepository.getLatestRating.mockResolvedValue(null);
    industryGroupRsRatingRepository.getLatestRating.mockResolvedValue(null);
    getIndustryGroupQuadrant.execute.mockResolvedValue(null);

    const context = await service.enrich(ticker);

    expect(context.industryGroup).toBe('Banks');
    expect(context.industryGroupQuadrant).toBeNull();
  });

  it('nulls the quadrant when the use case throws', async () => {
    classificationRepository.findByTicker.mockResolvedValue(
      classification('Banks'),
    );
    rsRatingRepository.getLatestRating.mockResolvedValue(rsRating(50));
    industryGroupRsRatingRepository.getLatestRating.mockResolvedValue(null);
    getIndustryGroupQuadrant.execute.mockRejectedValue(new Error('db down'));

    const context = await service.enrich(ticker);

    expect(context.globalRsRating).toBe(50);
    expect(context.industryGroupQuadrant).toBeNull();
  });

  it('is best-effort: a failing repository nulls only its own field', async () => {
    classificationRepository.findByTicker.mockResolvedValue(
      classification('Banks'),
    );
    rsRatingRepository.getLatestRating.mockRejectedValue(new Error('db down'));
    industryGroupRsRatingRepository.getLatestRating.mockResolvedValue(
      industryGroupRsRating(70),
    );
    getIndustryGroupQuadrant.execute.mockResolvedValue('Improving');

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
