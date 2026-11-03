import { InvariantError } from '../domain-errors';
import {
  MarketHealthStatus,
  MarketHealthStatusValue,
} from './market-health-status';

describe('MarketHealthStatus', () => {
  it.each(['GOOD', 'WARNING', 'BAD'])('should accept %s', (value) => {
    expect(MarketHealthStatus.of(value).value).toBe(value);
  });

  it.each([
    ['empty', ''],
    ['wrong case', 'good'],
    ['unknown', 'UNKNOWN'],
  ])('should reject %s', (_label, value) => {
    expect(() => MarketHealthStatus.of(value)).toThrow(InvariantError);
  });

  it.each([
    ['good', MarketHealthStatus.good(), MarketHealthStatusValue.GOOD],
    ['warning', MarketHealthStatus.warning(), MarketHealthStatusValue.WARNING],
    ['bad', MarketHealthStatus.bad(), MarketHealthStatusValue.BAD],
  ])('should build %s', (_label, status, expected) => {
    expect(status.value).toBe(expected);
  });
});
