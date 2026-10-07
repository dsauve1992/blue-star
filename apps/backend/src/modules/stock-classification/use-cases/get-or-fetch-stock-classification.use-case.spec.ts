import { GetOrFetchStockClassificationUseCase } from './get-or-fetch-stock-classification.use-case';
import { StockClassification } from '../domain/entities/stock-classification.entity';
import type { StockClassificationRepository } from '../domain/repositories/stock-classification.repository.interface';
import type {
  RawStockClassification,
  StockClassifierService,
} from '../domain/services/stock-classifier.service';

const HOUR_MS = 60 * 60 * 1000;

function cachedRow(overrides: {
  industryKey?: string | null;
  industryGroup?: string | null;
  ageMs?: number;
}): StockClassification {
  return StockClassification.fromData({
    ticker: 'AAPL',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    industryKey: overrides.industryKey ?? null,
    industryGroup: overrides.industryGroup ?? null,
    classifiedAt: new Date(Date.now() - (overrides.ageMs ?? 0)),
  });
}

describe('GetOrFetchStockClassificationUseCase', () => {
  let repository: jest.Mocked<StockClassificationRepository>;
  let classifier: jest.Mocked<StockClassifierService>;
  let useCase: GetOrFetchStockClassificationUseCase;

  const classifierReturns = (raw: Partial<RawStockClassification>) =>
    classifier.classify.mockResolvedValue({
      ticker: 'AAPL',
      sector: '',
      industry: '',
      industryKey: '',
      ...raw,
    });

  beforeEach(() => {
    repository = {
      findByTicker: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<StockClassificationRepository>;
    classifier = { classify: jest.fn() };
    useCase = new GetOrFetchStockClassificationUseCase(repository, classifier);
  });

  it('returns a cached row with a group without calling the classifier', async () => {
    const cached = cachedRow({
      industryKey: 'specialty-chemicals',
      industryGroup: 'Materials',
    });
    repository.findByTicker.mockResolvedValue(cached);

    await expect(useCase.execute('aapl')).resolves.toBe(cached);
    expect(classifier.classify).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('re-classifies a null-group row older than the retry window and saves the result', async () => {
    repository.findByTicker.mockResolvedValue(
      cachedRow({ ageMs: 25 * HOUR_MS }),
    );
    classifierReturns({
      sector: 'Basic Materials',
      industry: 'Specialty Chemicals',
      industryKey: 'specialty-chemicals',
    });

    const result = await useCase.execute('AAPL');

    expect(classifier.classify).toHaveBeenCalledWith('AAPL');
    expect(result.industryGroup).toBe('Materials');
    expect(repository.save).toHaveBeenCalledWith(result);
  });

  it('returns a null-group row inside the retry window without calling the classifier', async () => {
    const cached = cachedRow({ ageMs: HOUR_MS });
    repository.findByTicker.mockResolvedValue(cached);

    await expect(useCase.execute('AAPL')).resolves.toBe(cached);
    expect(classifier.classify).not.toHaveBeenCalled();
  });

  it('keeps the cached row when the classifier returns an empty industryKey', async () => {
    const cached = cachedRow({ ageMs: 25 * HOUR_MS });
    repository.findByTicker.mockResolvedValue(cached);
    classifierReturns({});

    await expect(useCase.execute('AAPL')).resolves.toBe(cached);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('saves an empty classification when nothing is cached', async () => {
    repository.findByTicker.mockResolvedValue(null);
    classifierReturns({});

    const result = await useCase.execute('AAPL');

    expect(result.industryGroup).toBeNull();
    expect(repository.save).toHaveBeenCalledWith(result);
  });

  it('heals a cached row whose industryKey is mapped, without calling the classifier', async () => {
    repository.findByTicker.mockResolvedValue(
      cachedRow({ industryKey: 'specialty-chemicals', ageMs: HOUR_MS }),
    );

    const result = await useCase.execute('AAPL');

    expect(classifier.classify).not.toHaveBeenCalled();
    expect(result.industryGroup).toBe('Materials');
    expect(repository.save).toHaveBeenCalledWith(result);
  });
});
