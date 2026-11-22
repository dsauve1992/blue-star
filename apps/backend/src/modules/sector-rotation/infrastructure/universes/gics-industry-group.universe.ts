import { RotationMember } from '../../domain/value-objects/rotation-member';
import { RotationUniverse } from '../../domain/value-objects/rotation-universe';

export const GICS_INDUSTRY_GROUP_UNIVERSE_ID = 'gics-industry-group';

// Yahoo's ^SP500-<code> group subindices have no price history for most groups,
// so each GICS industry group is tracked through a proxy ETF.
const MEMBERS: ReadonlyArray<{ name: string; symbol: string }> = [
  { name: 'Energy', symbol: 'XLE' },
  { name: 'Materials', symbol: 'XLB' },
  { name: 'Capital Goods', symbol: 'XLI' },
  { name: 'Commercial & Professional Services', symbol: 'IYJ' },
  { name: 'Transportation', symbol: 'IYT' },
  { name: 'Automobiles & Components', symbol: 'CARZ' },
  { name: 'Consumer Durables & Apparel', symbol: 'ITB' },
  { name: 'Consumer Services', symbol: 'PEJ' },
  {
    name: 'Consumer Discretionary Distribution & Retail',
    symbol: 'XRT',
  },
  { name: 'Consumer Staples Distribution & Retail', symbol: 'XLP' },
  { name: 'Food, Beverage & Tobacco', symbol: 'PBJ' },
  { name: 'Household & Personal Products', symbol: 'VDC' },
  { name: 'Health Care Equipment & Services', symbol: 'IHI' },
  {
    name: 'Pharmaceuticals, Biotechnology & Life Sciences',
    symbol: 'PPH',
  },
  { name: 'Banks', symbol: 'KBWB' },
  { name: 'Financial Services', symbol: 'IYG' },
  { name: 'Insurance', symbol: 'KIE' },
  { name: 'Software & Services', symbol: 'IGV' },
  { name: 'Technology Hardware & Equipment', symbol: 'XLK' },
  {
    name: 'Semiconductors & Semiconductor Equipment',
    symbol: 'SMH',
  },
  { name: 'Telecommunication Services', symbol: 'IYZ' },
  { name: 'Media & Entertainment', symbol: 'XLC' },
  { name: 'Utilities', symbol: 'XLU' },
  {
    name: 'Equity Real Estate Investment Trusts (REITs)',
    symbol: 'VNQ',
  },
  { name: 'Real Estate Management & Development', symbol: 'XLRE' },
];

export const GICS_INDUSTRY_GROUP_UNIVERSE: RotationUniverse =
  RotationUniverse.of({
    id: GICS_INDUSTRY_GROUP_UNIVERSE_ID,
    label: 'GICS Industry Groups (25 ETF proxies)',
    members: MEMBERS.map((m) => RotationMember.of(m.name, m.symbol)),
    benchmarkSymbol: 'SPY',
  });
