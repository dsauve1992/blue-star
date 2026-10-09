import { Test, TestingModule } from '@nestjs/testing';
import { GapContextServiceImpl } from './gap-context.service';
import { WatchlistTicker } from '../../../watchlist/domain/value-objects/watchlist-ticker';
import { GetIndustryGroupsForTickersUseCase } from '../../../stock-classification/use-cases/get-industry-groups-for-tickers.use-case';
import { GetLatestRsRatingUseCase } from '../../../stock-analysis/use-cases/get-latest-rs-rating.use-case';
import { GetLatestIndustryGroupRsRatingUseCase } from '../../../stock-analysis/use-cases/get-latest-industry-group-rs-rating.use-case';
import { GetIndustryGroupQuadrantUseCase } from '../../../sector-rotation/use-cases/get-industry-group-quadrant.use-case';

describe('GapContextServiceImpl', () => {
  let service: GapContextServiceImpl;
  let getIndustryGroups: jest.Mocked<GetIndustryGroupsForTickersUseCase>;
  let getLatestRsRating: jest.Mocked<GetLatestRsRatingUseCase>;
  let getLatestIndustryGroupRsRating: jest.Mocked<GetLatestIndustryGroupRsRatingUseCase>;
  let getIndustryGroupQuadrant: jest.Mocked<GetIndustryGroupQuadrantUseCase>;

  const ticker = WatchlistTicker.of('NASDAQ:NVDA');

  beforeEach(async () => {
    getIndustryGroups = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetIndustryGroupsForTickersUseCase>;
    getLatestRsRating = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetLatestRsRatingUseCase>;
    getLatestIndustryGroupRsRating = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetLatestIndustryGroupRsRatingUseCase>;
    getIndustryGroupQuadrant = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetIndustryGroupQuadrantUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GapContextServiceImpl,
        {
          provide: GetIndustryGroupsForTickersUseCase,
          useValue: getIndustryGroups,
        },
        { provide: GetLatestRsRatingUseCase, useValue: getLatestRsRating },
        {
          provide: GetLatestIndustryGroupRsRatingUseCase,
          useValue: getLatestIndustryGroupRsRating,
        },
        {
          provide: GetIndustryGroupQuadrantUseCase,
          useValue: getIndustryGroupQuadrant,
        },
      ],
    }).compile();

    service = module.get(GapContextServiceImpl);
  });

  function groups(industryGroup: string | null) {
    return new Map<string, string | null>([['NVDA', industryGroup]]);
  }

  it('resolves all four context fields and joins industry group to its subindex quadrant', async () => {
    getIndustryGroups.execute.mockResolvedValue(
      groups('Semiconductors & Semiconductor Equipment'),
    );
    getLatestRsRating.execute.mockResolvedValue(97);
    getLatestIndustryGroupRsRating.execute.mockResolvedValue(88);
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
    expect(getLatestRsRating.execute).toHaveBeenCalledWith('NVDA');
  });

  it('nulls the quadrant but keeps other fields when no industry group is classified', async () => {
    getIndustryGroups.execute.mockResolvedValue(groups(null));
    getLatestRsRating.execute.mockResolvedValue(97);
    getLatestIndustryGroupRsRating.execute.mockResolvedValue(null);

    const context = await service.enrich(ticker);

    expect(context.industryGroup).toBeNull();
    expect(context.globalRsRating).toBe(97);
    expect(context.industryGroupRsRating).toBeNull();
    expect(context.industryGroupQuadrant).toBeNull();
    expect(getIndustryGroupQuadrant.execute).not.toHaveBeenCalled();
  });

  it('nulls the quadrant when the use case finds none', async () => {
    getIndustryGroups.execute.mockResolvedValue(groups('Banks'));
    getLatestRsRating.execute.mockResolvedValue(null);
    getLatestIndustryGroupRsRating.execute.mockResolvedValue(null);
    getIndustryGroupQuadrant.execute.mockResolvedValue(null);

    const context = await service.enrich(ticker);

    expect(context.industryGroup).toBe('Banks');
    expect(context.industryGroupQuadrant).toBeNull();
  });

  it('nulls the quadrant when the use case throws', async () => {
    getIndustryGroups.execute.mockResolvedValue(groups('Banks'));
    getLatestRsRating.execute.mockResolvedValue(50);
    getLatestIndustryGroupRsRating.execute.mockResolvedValue(null);
    getIndustryGroupQuadrant.execute.mockRejectedValue(new Error('db down'));

    const context = await service.enrich(ticker);

    expect(context.globalRsRating).toBe(50);
    expect(context.industryGroupQuadrant).toBeNull();
  });

  it('is best-effort: a failing repository nulls only its own field', async () => {
    getIndustryGroups.execute.mockResolvedValue(groups('Banks'));
    getLatestRsRating.execute.mockRejectedValue(new Error('db down'));
    getLatestIndustryGroupRsRating.execute.mockResolvedValue(70);
    getIndustryGroupQuadrant.execute.mockResolvedValue('Improving');

    const context = await service.enrich(ticker);

    expect(context.industryGroup).toBe('Banks');
    expect(context.globalRsRating).toBeNull();
    expect(context.industryGroupRsRating).toBe(70);
    expect(context.industryGroupQuadrant).toBe('Improving');
  });

  it('returns an empty context when every lookup misses', async () => {
    getIndustryGroups.execute.mockResolvedValue(new Map());
    getLatestRsRating.execute.mockResolvedValue(null);
    getLatestIndustryGroupRsRating.execute.mockResolvedValue(null);

    const context = await service.enrich(ticker);

    expect(context.industryGroup).toBeNull();
    expect(context.globalRsRating).toBeNull();
    expect(context.industryGroupRsRating).toBeNull();
    expect(context.industryGroupQuadrant).toBeNull();
  });
});
