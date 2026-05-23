import {
  GICS_SECTOR_UNIVERSE,
  GICS_SECTOR_UNIVERSE_ID,
  findGicsSectorByYFinance,
} from './gics-sector.universe';

describe('GICS_SECTOR_UNIVERSE', () => {
  it('has the canonical id gics-sector', () => {
    expect(GICS_SECTOR_UNIVERSE.id).toBe(GICS_SECTOR_UNIVERSE_ID);
    expect(GICS_SECTOR_UNIVERSE.id).toBe('gics-sector');
  });

  it('contains exactly 11 SPDR sector ETFs', () => {
    expect(GICS_SECTOR_UNIVERSE.members).toHaveLength(11);
  });

  it('contains the expected ETF symbols', () => {
    const symbols = GICS_SECTOR_UNIVERSE.members.map((m) => m.symbol).sort();
    expect(symbols).toEqual(
      [
        'XLK',
        'XLE',
        'XLI',
        'XLY',
        'XLP',
        'XLV',
        'XLF',
        'XLB',
        'XLU',
        'XLRE',
        'XLC',
      ].sort(),
    );
  });

  it.each([
    ['XLK', 'Technology'],
    ['XLE', 'Energy'],
    ['XLI', 'Industrial'],
    ['XLY', 'Consumer Discretionary'],
    ['XLP', 'Consumer Staples'],
    ['XLV', 'Healthcare'],
    ['XLF', 'Financial'],
    ['XLB', 'Materials'],
    ['XLU', 'Utilities'],
    ['XLRE', 'Real Estate'],
    ['XLC', 'Communication Services'],
  ])('maps symbol %s to name %s', (symbol, name) => {
    expect(GICS_SECTOR_UNIVERSE.findBySymbol(symbol)?.name).toBe(name);
  });

  it('uses SPY as the benchmark', () => {
    expect(GICS_SECTOR_UNIVERSE.benchmarkSymbol).toBe('SPY');
  });
});

describe('findGicsSectorByYFinance', () => {
  it.each([
    ['Technology', 'Technology'],
    ['Energy', 'Energy'],
    ['Industrials', 'Industrial'],
    ['Consumer Cyclical', 'Consumer Discretionary'],
    ['Consumer Defensive', 'Consumer Staples'],
    ['Healthcare', 'Healthcare'],
    ['Financial Services', 'Financial'],
    ['Basic Materials', 'Materials'],
    ['Utilities', 'Utilities'],
    ['Real Estate', 'Real Estate'],
    ['Communication Services', 'Communication Services'],
  ])('maps yfinance %s to member %s', (yf, memberName) => {
    expect(findGicsSectorByYFinance(yf)?.name).toBe(memberName);
  });

  it('returns null for empty input', () => {
    expect(findGicsSectorByYFinance('')).toBeNull();
    expect(findGicsSectorByYFinance('   ')).toBeNull();
  });

  it('returns null for unknown yfinance sector', () => {
    expect(findGicsSectorByYFinance('Crypto')).toBeNull();
  });
});
