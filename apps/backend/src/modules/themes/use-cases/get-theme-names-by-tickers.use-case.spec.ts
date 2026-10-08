import { GetThemeNamesByTickersUseCase } from './get-theme-names-by-tickers.use-case';
import type { ThemeRepository } from '../domain/repositories/theme.repository.interface';
import { ThemeEntity } from '../domain/entities/theme.entity';

describe('GetThemeNamesByTickersUseCase', () => {
  let useCase: GetThemeNamesByTickersUseCase;
  let repository: jest.Mocked<ThemeRepository>;

  beforeEach(() => {
    repository = {
      saveTheme: jest.fn(),
      findThemeByName: jest.fn(),
      replaceThemeTickers: jest.fn(),
      findTickersByThemeId: jest.fn(),
      findThemesByTickers: jest.fn(),
      findAllThemes: jest.fn(),
    };
    useCase = new GetThemeNamesByTickersUseCase(repository);
  });

  function theme(name: string): ThemeEntity {
    return ThemeEntity.of({
      id: name,
      name,
      createdAt: new Date('2026-06-20'),
      updatedAt: new Date('2026-06-20'),
    });
  }

  it('maps each ticker to its theme names in repository order', async () => {
    repository.findThemesByTickers.mockResolvedValue(
      new Map([
        ['NVDA', [theme('Semiconductors'), theme('AI Infrastructure')]],
        [
          'AMD',
          [theme('Data Centers'), theme('GPUs'), theme('Semiconductors')],
        ],
      ]),
    );

    const result = await useCase.execute(['NVDA', 'AMD']);

    expect(repository.findThemesByTickers).toHaveBeenCalledWith([
      'NVDA',
      'AMD',
    ]);
    expect([...result]).toEqual([
      ['NVDA', ['Semiconductors', 'AI Infrastructure']],
      ['AMD', ['Data Centers', 'GPUs', 'Semiconductors']],
    ]);
  });

  it('omits a ticker the repository does not return', async () => {
    repository.findThemesByTickers.mockResolvedValue(
      new Map([['NVDA', [theme('Semiconductors')]]]),
    );

    const result = await useCase.execute(['NVDA', 'XYZ']);

    expect(result.has('XYZ')).toBe(false);
    expect(result.get('NVDA')).toEqual(['Semiconductors']);
  });

  it('returns an empty map for an empty input', async () => {
    repository.findThemesByTickers.mockResolvedValue(new Map());

    const result = await useCase.execute([]);

    expect(result.size).toBe(0);
  });
});
