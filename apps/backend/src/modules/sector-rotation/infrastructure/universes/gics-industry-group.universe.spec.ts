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

  it('every member uses the ^SP500-NNNN Yahoo Finance symbol scheme', () => {
    for (const m of GICS_INDUSTRY_GROUP_UNIVERSE.members) {
      expect(m.symbol).toMatch(/^\^SP500-\d{4}$/);
    }
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
    ['^SP500-1010', 'Energy'],
    ['^SP500-1510', 'Materials'],
    ['^SP500-2010', 'Capital Goods'],
    ['^SP500-2020', 'Commercial & Professional Services'],
    ['^SP500-2030', 'Transportation'],
    ['^SP500-2510', 'Automobiles & Components'],
    ['^SP500-2520', 'Consumer Durables & Apparel'],
    ['^SP500-2530', 'Consumer Services'],
    ['^SP500-2550', 'Consumer Discretionary Distribution & Retail'],
    ['^SP500-3010', 'Consumer Staples Distribution & Retail'],
    ['^SP500-3020', 'Food, Beverage & Tobacco'],
    ['^SP500-3030', 'Household & Personal Products'],
    ['^SP500-3510', 'Health Care Equipment & Services'],
    ['^SP500-3520', 'Pharmaceuticals, Biotechnology & Life Sciences'],
    ['^SP500-4010', 'Banks'],
    ['^SP500-4020', 'Financial Services'],
    ['^SP500-4030', 'Insurance'],
    ['^SP500-4510', 'Software & Services'],
    ['^SP500-4520', 'Technology Hardware & Equipment'],
    ['^SP500-4530', 'Semiconductors & Semiconductor Equipment'],
    ['^SP500-5010', 'Telecommunication Services'],
    ['^SP500-5020', 'Media & Entertainment'],
    ['^SP500-5510', 'Utilities'],
    ['^SP500-6010', 'Equity Real Estate Investment Trusts (REITs)'],
    ['^SP500-6020', 'Real Estate Management & Development'],
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
    expect(GICS_INDUSTRY_GROUP_UNIVERSE.hasSymbol('^SP500-9999')).toBe(false);
    expect(GICS_INDUSTRY_GROUP_UNIVERSE.hasSymbol('XLK')).toBe(false);
  });
});
