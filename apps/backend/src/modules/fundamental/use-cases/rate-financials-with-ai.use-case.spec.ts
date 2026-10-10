import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Symbol } from '../../../shared/value-objects/symbol';
import {
  AI_FINANCIAL_RATER,
  AI_FINANCIAL_RATING_REPOSITORY,
} from '../constants/tokens';
import { NotFoundError } from '../domain/domain-errors';
import type { AiFinancialRatingRepository } from '../domain/repositories/ai-financial-rating.repository.interface';
import {
  AiFinancialRater,
  AiFinancialRating,
  AiRaterUnavailableError,
} from '../domain/services/ai-financial-rater';
import { AnnualGrowth } from '../domain/value-objects/annual-growth';
import { CanslimRating } from '../domain/value-objects/canslim-rating';
import { FinancialReport } from '../domain/value-objects/financial-report';
import { ComputeFinancialReportUseCase } from './compute-financial-report.use-case';
import { RateFinancialsWithAiUseCase } from './rate-financials-with-ai.use-case';

const FINGERPRINT = 'fingerprint-1';

const RATING: AiFinancialRating = {
  model: 'jev-latest',
  grade: 'B',
  gradeConfidence: 0.8,
  gradeProbabilities: { A: 0.1, B: 0.6, C: 0.2, D: 0.05, F: 0.05 },
  currentEarnings: { scorePercent: 75, confidence: 0.7, label: 'Solid' },
  annualEarnings: { scorePercent: 50, confidence: 0.6, label: 'Mixed' },
};

const REPORT = FinancialReport.of({
  symbol: 'AAPL',
  quarterlyGrowths: [],
  annualGrowths: [
    AnnualGrowth.of({
      year: '2025',
      eps: 4,
      epsGrowthPercent: 40,
      returnOnEquityPercent: 25,
    }),
  ],
});

const EMPTY_REPORT = FinancialReport.of({
  symbol: 'AAPL',
  quarterlyGrowths: [],
  annualGrowths: [],
});

const NO_RATING = CanslimRating.of({
  grade: null,
  scorePercent: null,
  criteria: [],
});

describe('RateFinancialsWithAiUseCase', () => {
  let useCase: RateFinancialsWithAiUseCase;
  let mockCompute: jest.Mocked<Pick<ComputeFinancialReportUseCase, 'execute'>>;
  let mockRater: jest.Mocked<AiFinancialRater>;
  let mockRepo: jest.Mocked<AiFinancialRatingRepository>;
  const symbol = Symbol.of('AAPL');

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    mockCompute = {
      execute: jest
        .fn()
        .mockResolvedValue({ report: REPORT, rating: NO_RATING }),
    };
    mockRater = {
      requestFingerprint: jest.fn().mockReturnValue(FINGERPRINT),
      rate: jest.fn().mockResolvedValue(RATING),
    };
    mockRepo = {
      findByFingerprint: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        RateFinancialsWithAiUseCase,
        { provide: ComputeFinancialReportUseCase, useValue: mockCompute },
        { provide: AI_FINANCIAL_RATER, useValue: mockRater },
        { provide: AI_FINANCIAL_RATING_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    useCase = module.get(RateFinancialsWithAiUseCase);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return the cached rating without calling the rater', async () => {
    mockRepo.findByFingerprint.mockResolvedValue(RATING);

    const response = await useCase.execute({ symbol });

    expect(response).toEqual({ rating: RATING });
    expect(mockRepo.findByFingerprint).toHaveBeenNthCalledWith(
      1,
      symbol,
      FINGERPRINT,
    );
    expect(mockRater.rate).not.toHaveBeenCalled();
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('should rate on a cache miss and save the rating with its fingerprint', async () => {
    const response = await useCase.execute({ symbol });

    expect(mockRater.rate).toHaveBeenNthCalledWith(1, REPORT);
    expect(mockRepo.save).toHaveBeenNthCalledWith(
      1,
      symbol,
      FINGERPRINT,
      RATING,
    );
    expect(response).toEqual({ rating: RATING });
  });

  it('should throw NotFoundError when the report has no growth data', async () => {
    mockCompute.execute.mockResolvedValue({
      report: EMPTY_REPORT,
      rating: NO_RATING,
    });

    await expect(useCase.execute({ symbol })).rejects.toThrow(NotFoundError);
    expect(mockRater.rate).not.toHaveBeenCalled();
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('should propagate rater failures without saving anything', async () => {
    mockRater.rate.mockRejectedValue(new AiRaterUnavailableError('down'));

    await expect(useCase.execute({ symbol })).rejects.toThrow(
      AiRaterUnavailableError,
    );
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('should retry the rater after a failure instead of caching it in flight', async () => {
    mockRater.rate
      .mockRejectedValueOnce(new AiRaterUnavailableError('down'))
      .mockResolvedValueOnce(RATING);

    await expect(useCase.execute({ symbol })).rejects.toThrow(
      AiRaterUnavailableError,
    );
    const response = await useCase.execute({ symbol });

    expect(response).toEqual({ rating: RATING });
    expect(mockRater.rate).toHaveBeenCalledTimes(2);
  });

  it('should still return the rating when saving it fails', async () => {
    mockRepo.save.mockRejectedValue(new Error('db down'));

    const response = await useCase.execute({ symbol });

    expect(response).toEqual({ rating: RATING });
  });

  it('should call the rater once for concurrent requests on the same report', async () => {
    let resolveRating!: (rating: AiFinancialRating) => void;
    mockRater.rate.mockReturnValue(
      new Promise<AiFinancialRating>((resolve) => {
        resolveRating = resolve;
      }),
    );

    const first = useCase.execute({ symbol });
    const second = useCase.execute({ symbol });
    await new Promise((resolve) => setImmediate(resolve));
    resolveRating(RATING);
    const responses = await Promise.all([first, second]);

    expect(responses).toEqual([{ rating: RATING }, { rating: RATING }]);
    expect(mockRater.rate).toHaveBeenCalledTimes(1);
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
  });
});
