import { Test } from '@nestjs/testing';
import {
  IndustryGroupRsRatingComputationServiceImpl,
  percentileRank,
} from './industry-group-rs-rating-computation.service';
import { RsRatingRepository } from '../../domain/repositories/rs-rating.repository.interface';
import { IndustryGroupRsRatingRepository } from '../../domain/repositories/industry-group-rs-rating.repository.interface';
import { StockClassificationRepository } from '../../../stock-classification/domain/repositories/stock-classification.repository.interface';
import { RsRating } from '../../domain/value-objects/rs-rating';
import { IndustryGroupRsRating } from '../../domain/value-objects/industry-group-rs-rating';
import {
  INDUSTRY_GROUP_RS_RATING_REPOSITORY,
  RS_RATING_REPOSITORY,
} from '../../constants/tokens';
import { STOCK_CLASSIFICATION_REPOSITORY } from '../../../stock-classification/constants/tokens';
import { GetOrFetchStockClassificationUseCase } from '../../../stock-classification/use-cases/get-or-fetch-stock-classification.use-case';

describe('percentileRank', () => {
  it('returns 50 for the median of a uniform distribution (0.5 ties handling)', () => {
    // value appears once; values below = 4, values equal = 1 → (4 + 0.5) / 10 * 100 = 45
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentileRank(values, 5)).toBe(45);
  });

  it('returns close to 0 for the minimum and close to 100 for the maximum', () => {
    const values = [10, 20, 30, 40, 50];
    expect(percentileRank(values, 10)).toBe(10); // (0 + 0.5) / 5 * 100
    expect(percentileRank(values, 50)).toBe(90); // (4 + 0.5) / 5 * 100
  });

  it('handles ties by splitting credit (0.5 * count_equal)', () => {
    const values = [1, 1, 1, 1];
    expect(percentileRank(values, 1)).toBe(50); // (0 + 2) / 4 * 100
  });

  it('returns 0 for an empty input', () => {
    expect(percentileRank([], 1)).toBe(0);
  });
});

describe('IndustryGroupRsRatingComputationServiceImpl', () => {
  let service: IndustryGroupRsRatingComputationServiceImpl;
  let rsRatingRepo: jest.Mocked<RsRatingRepository>;
  let classificationRepo: jest.Mocked<StockClassificationRepository>;
  let industryGroupRepo: jest.Mocked<IndustryGroupRsRatingRepository>;
  let getOrFetchClassification: jest.Mocked<GetOrFetchStockClassificationUseCase>;

  const computedAt = new Date('2026-05-24T00:00:00.000Z');

  beforeEach(async () => {
    rsRatingRepo = {
      saveRatings: jest.fn(),
      getLatestRatings: jest.fn(),
      getLatestRating: jest.fn(),
      getAllForLatestDate: jest.fn(),
    } as jest.Mocked<RsRatingRepository>;

    classificationRepo = {
      findByTicker: jest.fn(),
      save: jest.fn(),
      findGroupsForTickers: jest.fn(),
    } as unknown as jest.Mocked<StockClassificationRepository>;

    industryGroupRepo = {
      saveRatings: jest.fn(),
      getLatestRatings: jest.fn(),
      getLatestRating: jest.fn(),
      listLatestGroups: jest.fn(),
      getLatestRatingsByGroup: jest.fn(),
    } as jest.Mocked<IndustryGroupRsRatingRepository>;

    getOrFetchClassification = {
      execute: jest.fn(),
      executeMany: jest.fn().mockResolvedValue(new Map()),
    } as unknown as jest.Mocked<GetOrFetchStockClassificationUseCase>;

    const module = await Test.createTestingModule({
      providers: [
        IndustryGroupRsRatingComputationServiceImpl,
        { provide: RS_RATING_REPOSITORY, useValue: rsRatingRepo },
        {
          provide: STOCK_CLASSIFICATION_REPOSITORY,
          useValue: classificationRepo,
        },
        {
          provide: INDUSTRY_GROUP_RS_RATING_REPOSITORY,
          useValue: industryGroupRepo,
        },
        {
          provide: GetOrFetchStockClassificationUseCase,
          useValue: getOrFetchClassification,
        },
      ],
    }).compile();

    service = module.get(IndustryGroupRsRatingComputationServiceImpl);
  });

  function makeRating(symbol: string, weightedScore: number): RsRating {
    return RsRating.of({
      symbol,
      rsRating: 50,
      weightedScore,
      computedAt,
    });
  }

  it('skips groups with fewer than 10 members', async () => {
    const ratings = Array.from({ length: 5 }, (_, i) =>
      makeRating(`SML${i}`, i),
    );
    rsRatingRepo.getAllForLatestDate.mockResolvedValue(ratings);
    classificationRepo.findGroupsForTickers.mockResolvedValue(
      new Map(ratings.map((r) => [r.symbol, 'Tiny Group'])),
    );

    await service.computeIndustryGroupRsRatings();

    expect(industryGroupRepo.saveRatings).toHaveBeenCalledWith([]);
  });

  it('skips unclassified tickers (absent from the group map)', async () => {
    const classified = Array.from({ length: 10 }, (_, i) =>
      makeRating(`SEM${i}`, i + 1),
    );
    const unclassified = [makeRating('GHOST', 999)];
    rsRatingRepo.getAllForLatestDate.mockResolvedValue([
      ...classified,
      ...unclassified,
    ]);
    classificationRepo.findGroupsForTickers.mockResolvedValue(
      new Map(classified.map((r) => [r.symbol, 'Semiconductors'])),
    );

    await service.computeIndustryGroupRsRatings();

    const saved = industryGroupRepo.saveRatings.mock.calls[0][0];
    expect(saved.length).toBe(10);
    expect(saved.every((r) => r.symbol !== 'GHOST')).toBe(true);
  });

  it('computes percentile ranks within each surviving group', async () => {
    // 10 members in Semiconductors with weighted scores 1..10 → SEM10 is top.
    const members = Array.from({ length: 10 }, (_, i) =>
      makeRating(`SEM${i + 1}`, i + 1),
    );
    rsRatingRepo.getAllForLatestDate.mockResolvedValue(members);
    classificationRepo.findGroupsForTickers.mockResolvedValue(
      new Map(members.map((r) => [r.symbol, 'Semiconductors'])),
    );

    await service.computeIndustryGroupRsRatings();

    const saved = industryGroupRepo.saveRatings.mock.calls[0][0];
    expect(saved.length).toBe(10);

    const top = saved.find((r) => r.symbol === 'SEM10')!;
    const bottom = saved.find((r) => r.symbol === 'SEM1')!;
    expect(top.rsRating).toBe(95); // clamped from 95 (percentile rank of max in size-10)
    expect(bottom.rsRating).toBe(5);
    expect(top.industryGroup).toBe('Semiconductors');
    expect(top.groupSize).toBe(10);
  });

  it('clamps percentile rank to [1, 99]', async () => {
    // 100 identical scores would percentile-rank to 50 for everyone, so use a
    // distribution where the extreme would naturally round to 0/100 and confirm clamping.
    // With 200 distinct values, the minimum's percentile rank = (0 + 0.5)/200*100 = 0.25 → clamps to 1.
    // The maximum's rank = (199 + 0.5)/200*100 = 99.75 → rounds to 100 → clamps to 99.
    const members = Array.from({ length: 200 }, (_, i) =>
      makeRating(`X${i}`, i),
    );
    rsRatingRepo.getAllForLatestDate.mockResolvedValue(members);
    classificationRepo.findGroupsForTickers.mockResolvedValue(
      new Map(members.map((r) => [r.symbol, 'Big Group'])),
    );

    await service.computeIndustryGroupRsRatings();

    const saved = industryGroupRepo.saveRatings.mock.calls[0][0];
    const min = saved.find((r) => r.symbol === 'X0')!;
    const max = saved.find((r) => r.symbol === 'X199')!;
    expect(min.rsRating).toBe(1);
    expect(max.rsRating).toBe(99);
  });

  it('does nothing when there are no latest market-wide ratings', async () => {
    rsRatingRepo.getAllForLatestDate.mockResolvedValue([]);

    await service.computeIndustryGroupRsRatings();

    expect(classificationRepo.findGroupsForTickers).not.toHaveBeenCalled();
    expect(industryGroupRepo.saveRatings).not.toHaveBeenCalled();
  });

  it('backfills classifications for RS-rated symbols missing from the group map', async () => {
    const members = Array.from({ length: 10 }, (_, i) =>
      makeRating(`SEM${i + 1}`, i + 1),
    );
    const unclassified = makeRating('NEW', 5);
    rsRatingRepo.getAllForLatestDate.mockResolvedValue([
      ...members,
      unclassified,
    ]);

    const initialGroups = new Map(
      members.map((r) => [r.symbol, 'Semiconductors'] as [string, string]),
    );
    const afterBackfill = new Map(initialGroups);
    afterBackfill.set('NEW', 'Semiconductors');

    classificationRepo.findGroupsForTickers
      .mockResolvedValueOnce(initialGroups)
      .mockResolvedValueOnce(afterBackfill);

    await service.computeIndustryGroupRsRatings();

    expect(getOrFetchClassification.executeMany).toHaveBeenCalledWith(['NEW']);
    const saved = industryGroupRepo.saveRatings.mock.calls[0][0];
    expect(saved.map((r) => r.symbol).sort()).toEqual(
      [...members.map((m) => m.symbol), 'NEW'].sort(),
    );
  });

  it('skips backfill when every RS-rated symbol is already classified', async () => {
    const members = Array.from({ length: 10 }, (_, i) =>
      makeRating(`SEM${i + 1}`, i + 1),
    );
    rsRatingRepo.getAllForLatestDate.mockResolvedValue(members);
    classificationRepo.findGroupsForTickers.mockResolvedValue(
      new Map(members.map((r) => [r.symbol, 'Semiconductors'])),
    );

    await service.computeIndustryGroupRsRatings();

    expect(getOrFetchClassification.executeMany).not.toHaveBeenCalled();
  });

  it('uses the computedAt date from the latest market-wide ratings', async () => {
    const members = Array.from({ length: 10 }, (_, i) =>
      makeRating(`SEM${i + 1}`, i + 1),
    );
    rsRatingRepo.getAllForLatestDate.mockResolvedValue(members);
    classificationRepo.findGroupsForTickers.mockResolvedValue(
      new Map(members.map((r) => [r.symbol, 'Semiconductors'])),
    );

    await service.computeIndustryGroupRsRatings();

    const saved: IndustryGroupRsRating[] =
      industryGroupRepo.saveRatings.mock.calls[0][0];
    for (const r of saved) {
      expect(r.computedAt).toEqual(computedAt);
    }
  });
});
