import { ThemeServiceImpl } from '../theme.service';
import { ThemeRepository } from '../../../domain/repositories/theme.repository.interface';
import { ThemeEntity } from '../../../domain/entities/theme.entity';
import { PythonThemeExtractorService } from '../python-theme-extractor.service';

describe('ThemeServiceImpl', () => {
  let repository: jest.Mocked<ThemeRepository>;
  let extractor: jest.Mocked<
    Pick<PythonThemeExtractorService, 'extractThemes'>
  >;
  let service: ThemeServiceImpl;

  beforeEach(() => {
    repository = {
      saveTheme: jest.fn().mockResolvedValue(undefined),
      findThemeByName: jest.fn().mockResolvedValue(null),
      findAllThemes: jest.fn(),
      replaceThemeTickers: jest.fn().mockResolvedValue(undefined),
      findTickersByThemeId: jest.fn(),
      findThemesByTickers: jest.fn(),
    };
    extractor = { extractThemes: jest.fn() };
    service = new ThemeServiceImpl(
      repository,
      extractor as unknown as PythonThemeExtractorService,
    );
  });

  it('creates a new theme with uppercased tickers', async () => {
    extractor.extractThemes.mockResolvedValue([
      { theme: 'AI', tickers: ['nvda', 'amd'] },
    ] as never);

    await service.extractAndSaveThemes();

    expect(repository.saveTheme).toHaveBeenCalledTimes(1);
    const [themeId, tickers] = repository.replaceThemeTickers.mock.calls[0];
    expect(themeId).toBe(repository.saveTheme.mock.calls[0][0].id);
    expect(tickers.map((t) => t.ticker)).toEqual(['NVDA', 'AMD']);
  });

  it('updates an existing theme keeping its id', async () => {
    const existing = ThemeEntity.of({
      id: 'theme-1',
      name: 'AI',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    });
    repository.findThemeByName.mockResolvedValue(existing);
    extractor.extractThemes.mockResolvedValue([
      { theme: 'AI', tickers: ['msft'] },
    ] as never);

    await service.extractAndSaveThemes();

    const saved = repository.saveTheme.mock.calls[0][0];
    expect(saved.id).toBe('theme-1');
    expect(saved.createdAt).toEqual(existing.createdAt);
    expect(saved.updatedAt.getTime()).toBeGreaterThan(
      existing.updatedAt.getTime(),
    );
    expect(repository.replaceThemeTickers).toHaveBeenCalledWith(
      'theme-1',
      expect.any(Array),
    );
  });

  it('replaces tickers once per theme', async () => {
    extractor.extractThemes.mockResolvedValue([
      { theme: 'AI', tickers: ['nvda'] },
      { theme: 'Energy', tickers: ['xom'] },
    ] as never);

    await service.extractAndSaveThemes();

    expect(repository.replaceThemeTickers).toHaveBeenCalledTimes(2);
  });

  it('rethrows when the extractor fails', async () => {
    extractor.extractThemes.mockRejectedValue(new Error('python failed'));

    await expect(service.extractAndSaveThemes()).rejects.toThrow(
      'python failed',
    );
    expect(repository.replaceThemeTickers).not.toHaveBeenCalled();
  });
});
