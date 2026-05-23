import { RotationMember } from '../../domain/value-objects/rotation-member';
import { RotationUniverse } from '../../domain/value-objects/rotation-universe';

export const GICS_INDUSTRY_GROUP_UNIVERSE_ID = 'gics-industry-group';

// Yahoo Finance exposes S&P 500 GICS subindices under ^SP500-<code>, where the
// 4-digit code is the GICS industry-group identifier. There are 25 industry
// groups directly below the 11 sectors in the GICS taxonomy.
const MEMBERS: ReadonlyArray<{ name: string; symbol: string }> = [
  { name: 'Energy', symbol: '^SP500-1010' },
  { name: 'Materials', symbol: '^SP500-1510' },
  { name: 'Capital Goods', symbol: '^SP500-2010' },
  { name: 'Commercial & Professional Services', symbol: '^SP500-2020' },
  { name: 'Transportation', symbol: '^SP500-2030' },
  { name: 'Automobiles & Components', symbol: '^SP500-2510' },
  { name: 'Consumer Durables & Apparel', symbol: '^SP500-2520' },
  { name: 'Consumer Services', symbol: '^SP500-2530' },
  {
    name: 'Consumer Discretionary Distribution & Retail',
    symbol: '^SP500-2550',
  },
  { name: 'Consumer Staples Distribution & Retail', symbol: '^SP500-3010' },
  { name: 'Food, Beverage & Tobacco', symbol: '^SP500-3020' },
  { name: 'Household & Personal Products', symbol: '^SP500-3030' },
  { name: 'Health Care Equipment & Services', symbol: '^SP500-3510' },
  {
    name: 'Pharmaceuticals, Biotechnology & Life Sciences',
    symbol: '^SP500-3520',
  },
  { name: 'Banks', symbol: '^SP500-4010' },
  { name: 'Financial Services', symbol: '^SP500-4020' },
  { name: 'Insurance', symbol: '^SP500-4030' },
  { name: 'Software & Services', symbol: '^SP500-4510' },
  { name: 'Technology Hardware & Equipment', symbol: '^SP500-4520' },
  {
    name: 'Semiconductors & Semiconductor Equipment',
    symbol: '^SP500-4530',
  },
  { name: 'Telecommunication Services', symbol: '^SP500-5010' },
  { name: 'Media & Entertainment', symbol: '^SP500-5020' },
  { name: 'Utilities', symbol: '^SP500-5510' },
  {
    name: 'Equity Real Estate Investment Trusts (REITs)',
    symbol: '^SP500-6010',
  },
  { name: 'Real Estate Management & Development', symbol: '^SP500-6020' },
];

export const GICS_INDUSTRY_GROUP_UNIVERSE: RotationUniverse =
  RotationUniverse.of({
    id: GICS_INDUSTRY_GROUP_UNIVERSE_ID,
    label: 'GICS Industry Groups (25 S&P 500 subindices)',
    members: MEMBERS.map((m) => RotationMember.of(m.name, m.symbol)),
    benchmarkSymbol: 'SPY',
  });
