import { Symbol } from './symbol';

describe('Symbol', () => {
  it.each([
    'AAPL',
    'SPY',
    'BRK.B',
    'NYSE:CIEN',
    '^GSPC',
    '^SP500-4530',
    '^SP500-1010',
  ])('accepts %s', (input) => {
    expect(() => Symbol.of(input)).not.toThrow();
  });

  it.each([
    ['lowercase is normalized to uppercase', 'aapl', 'AAPL'],
    ['surrounding whitespace is trimmed', '  spy  ', 'SPY'],
    ['caret indices are preserved', '^sp500-4530', '^SP500-4530'],
  ])('%s', (_desc, input, expected) => {
    expect(Symbol.of(input).value).toBe(expected);
  });

  it.each(['', '   ', null as unknown as string, undefined as unknown as string])(
    'rejects empty/null input %p',
    (input) => {
      expect(() => Symbol.of(input)).toThrow(/non-empty string/);
    },
  );

  it.each([
    'AAPL$',
    'with space',
    '^^SP500',
    'A^SP500',
    'foo/bar',
  ])('rejects malformed symbol %s', (input) => {
    expect(() => Symbol.of(input)).toThrow(/Invalid symbol format/);
  });
});
