import { RotationMember } from '../../domain/value-objects/rotation-member';
import { RotationUniverse } from '../../domain/value-objects/rotation-universe';

export const GICS_SECTOR_UNIVERSE_ID = 'gics-sector';

const MEMBERS: ReadonlyArray<{ name: string; symbol: string }> = [
  { name: 'Technology', symbol: 'XLK' },
  { name: 'Energy', symbol: 'XLE' },
  { name: 'Industrial', symbol: 'XLI' },
  { name: 'Consumer Discretionary', symbol: 'XLY' },
  { name: 'Consumer Staples', symbol: 'XLP' },
  { name: 'Healthcare', symbol: 'XLV' },
  { name: 'Financial', symbol: 'XLF' },
  { name: 'Materials', symbol: 'XLB' },
  { name: 'Utilities', symbol: 'XLU' },
  { name: 'Real Estate', symbol: 'XLRE' },
  { name: 'Communication Services', symbol: 'XLC' },
];

export const GICS_SECTOR_UNIVERSE: RotationUniverse = RotationUniverse.of({
  id: GICS_SECTOR_UNIVERSE_ID,
  label: 'GICS Sectors (11 SPDR ETFs)',
  members: MEMBERS.map((m) => RotationMember.of(m.name, m.symbol)),
  benchmarkSymbol: 'SPY',
});

// yfinance reports stock-level sector strings that don't match our member names
// 1-for-1. This mapping is GICS-sector-specific — it doesn't apply to other
// universes (e.g. industry groups), so it lives on the universe definition.
const YFINANCE_TO_MEMBER_NAME: Record<string, string> = {
  Technology: 'Technology',
  Energy: 'Energy',
  Industrials: 'Industrial',
  'Consumer Cyclical': 'Consumer Discretionary',
  'Consumer Defensive': 'Consumer Staples',
  Healthcare: 'Healthcare',
  'Financial Services': 'Financial',
  'Basic Materials': 'Materials',
  Utilities: 'Utilities',
  'Real Estate': 'Real Estate',
  'Communication Services': 'Communication Services',
};

export function findGicsSectorByYFinance(
  yfinanceSector: string,
): RotationMember | null {
  if (!yfinanceSector || yfinanceSector.trim().length === 0) {
    return null;
  }
  const memberName = YFINANCE_TO_MEMBER_NAME[yfinanceSector.trim()];
  if (!memberName) {
    return null;
  }
  return GICS_SECTOR_UNIVERSE.findByName(memberName);
}
