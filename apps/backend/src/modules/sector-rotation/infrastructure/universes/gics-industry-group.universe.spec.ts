import {
  GICS_INDUSTRY_GROUP_UNIVERSE,
  GICS_INDUSTRY_GROUP_UNIVERSE_ID,
} from './gics-industry-group.universe';

describe('GICS_INDUSTRY_GROUP_UNIVERSE', () => {
  it('has the canonical id gics-industry-group', () => {
    expect(GICS_INDUSTRY_GROUP_UNIVERSE.id).toBe(
      GICS_INDUSTRY_GROUP_UNIVERSE_ID,
    );
    expect(GICS_INDUSTRY_GROUP_UNIVERSE.id).toBe('gics-industry-group');
  });

  it('contains exactly 25 GICS industry groups', () => {
    expect(GICS_INDUSTRY_GROUP_UNIVERSE.members).toHaveLength(25);
  });

  it('uses SPY as the benchmark', () => {
    expect(GICS_INDUSTRY_GROUP_UNIVERSE.benchmarkSymbol).toBe('SPY');
  });

  it('has a human-readable label', () => {
    expect(GICS_INDUSTRY_GROUP_UNIVERSE.label).toMatch(/Industry Group/i);
  });

  it('gives every member a distinct symbol', () => {
    const symbols = GICS_INDUSTRY_GROUP_UNIVERSE.members.map((m) => m.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
  });

  it('all symbols are unique', () => {
    const symbols = GICS_INDUSTRY_GROUP_UNIVERSE.members.map((m) => m.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
  });

  it('all names are unique', () => {
    const names = GICS_INDUSTRY_GROUP_UNIVERSE.members.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it.each([
    ['XLE', 'Energy'],
    ['XLB', 'Materials'],
    ['XLI', 'Capital Goods'],
    ['IYJ', 'Commercial & Professional Services'],
    ['IYT', 'Transportation'],
    ['CARZ', 'Automobiles & Components'],
    ['ITB', 'Consumer Durables & Apparel'],
    ['PEJ', 'Consumer Services'],
    ['XRT', 'Consumer Discretionary Distribution & Retail'],
    ['XLP', 'Consumer Staples Distribution & Retail'],
    ['PBJ', 'Food, Beverage & Tobacco'],
    ['VDC', 'Household & Personal Products'],
    ['IHI', 'Health Care Equipment & Services'],
    ['PPH', 'Pharmaceuticals, Biotechnology & Life Sciences'],
    ['KBWB', 'Banks'],
    ['IYG', 'Financial Services'],
    ['KIE', 'Insurance'],
    ['IGV', 'Software & Services'],
    ['XLK', 'Technology Hardware & Equipment'],
    ['SMH', 'Semiconductors & Semiconductor Equipment'],
    ['IYZ', 'Telecommunication Services'],
    ['XLC', 'Media & Entertainment'],
    ['XLU', 'Utilities'],
    ['VNQ', 'Equity Real Estate Investment Trusts (REITs)'],
    ['XLRE', 'Real Estate Management & Development'],
  ])('maps symbol %s to name %s', (symbol, name) => {
    expect(GICS_INDUSTRY_GROUP_UNIVERSE.findBySymbol(symbol)?.name).toBe(name);
  });

  it('findByName resolves the reverse lookup for every member', () => {
    for (const m of GICS_INDUSTRY_GROUP_UNIVERSE.members) {
      expect(GICS_INDUSTRY_GROUP_UNIVERSE.findByName(m.name)?.symbol).toBe(
        m.symbol,
      );
    }
  });

  it('hasSymbol returns false for an unknown symbol', () => {
    expect(GICS_INDUSTRY_GROUP_UNIVERSE.hasSymbol('^SP500-1010')).toBe(false);
    expect(GICS_INDUSTRY_GROUP_UNIVERSE.hasSymbol('XLF')).toBe(false);
  });
});
