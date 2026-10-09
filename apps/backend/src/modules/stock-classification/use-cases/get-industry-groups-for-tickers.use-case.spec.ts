import { GetIndustryGroupsForTickersUseCase } from './get-industry-groups-for-tickers.use-case';
import type { StockClassificationRepository } from '../domain/repositories/stock-classification.repository.interface';

describe('GetIndustryGroupsForTickersUseCase', () => {
  let repository: jest.Mocked<StockClassificationRepository>;
  let useCase: GetIndustryGroupsForTickersUseCase;

  beforeEach(() => {
    repository = {
      findGroupsForTickers: jest.fn(),
    } as unknown as jest.Mocked<StockClassificationRepository>;
    useCase = new GetIndustryGroupsForTickersUseCase(repository);
  });

  it('returns the cached groups keyed by ticker, preserving null groups', async () => {
    const groups = new Map<string, string | null>([
      ['NVDA', 'Semiconductors'],
      ['GHOST', null],
    ]);
    repository.findGroupsForTickers.mockResolvedValue(groups);

    const result = await useCase.execute(['NVDA', 'GHOST']);

    expect(repository.findGroupsForTickers).toHaveBeenCalledWith([
      'NVDA',
      'GHOST',
    ]);
    expect(result).toBe(groups);
  });
});
