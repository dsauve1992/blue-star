import {
  aggregateDay,
  BreadthCandle,
  evaluateSymbolOnDate,
  PARTIAL_RUN_MISSING_THRESHOLD,
  REQUIRED_TRAILING_SESSIONS,
} from './nh-nl-computation.service';

function buildCandles(
  count: number,
  overrides: Record<number, Partial<BreadthCandle>> = {},
): BreadthCandle[] {
  const candles: BreadthCandle[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(2020, 0, 1 + i).toISOString().split('T')[0];
    candles.push({
      date,
      high: 100,
      low: 90,
      ...overrides[i],
    });
  }
  return candles;
}

describe('evaluateSymbolOnDate', () => {
  it('excludes symbols with fewer than 252 prior sessions', () => {
    const candles = buildCandles(REQUIRED_TRAILING_SESSIONS);
    const result = evaluateSymbolOnDate(
      candles,
      REQUIRED_TRAILING_SESSIONS - 1,
    );
    expect(result.evaluable).toBe(false);
    expect(result.newHigh).toBe(false);
    expect(result.newLow).toBe(false);
  });

  it('is evaluable with exactly 252 prior sessions', () => {
    const candles = buildCandles(REQUIRED_TRAILING_SESSIONS + 1);
    const result = evaluateSymbolOnDate(candles, REQUIRED_TRAILING_SESSIONS);
    expect(result.evaluable).toBe(true);
  });

  it('uses only the trailing 252 sessions, not all history beyond the window', () => {
    const candles = buildCandles(REQUIRED_TRAILING_SESSIONS + 2, {
      [0]: { high: 600, low: 90 },
      [REQUIRED_TRAILING_SESSIONS + 1]: { high: 150, low: 90 },
    });
    const result = evaluateSymbolOnDate(
      candles,
      REQUIRED_TRAILING_SESSIONS + 1,
    );
    expect(result.newHigh).toBe(true);
  });

  it('counts an exact retest of the prior high as a new high (equality)', () => {
    const candles = buildCandles(REQUIRED_TRAILING_SESSIONS + 1, {
      [5]: { high: 150, low: 90 },
      [REQUIRED_TRAILING_SESSIONS]: { high: 150, low: 90 },
    });
    const result = evaluateSymbolOnDate(candles, REQUIRED_TRAILING_SESSIONS);
    expect(result.newHigh).toBe(true);
  });

  it('counts an exact retest of the prior low as a new low (equality)', () => {
    const candles = buildCandles(REQUIRED_TRAILING_SESSIONS + 1, {
      [5]: { high: 100, low: 50 },
      [REQUIRED_TRAILING_SESSIONS]: { high: 100, low: 50 },
    });
    const result = evaluateSymbolOnDate(candles, REQUIRED_TRAILING_SESSIONS);
    expect(result.newLow).toBe(true);
  });

  it('does not flag a new high when D is below the trailing max', () => {
    const candles = buildCandles(REQUIRED_TRAILING_SESSIONS + 1, {
      [5]: { high: 200, low: 90 },
      [REQUIRED_TRAILING_SESSIONS]: { high: 150, low: 90 },
    });
    const result = evaluateSymbolOnDate(candles, REQUIRED_TRAILING_SESSIONS);
    expect(result.newHigh).toBe(false);
  });

  it('does not flag a new low when D is above the trailing min', () => {
    const candles = buildCandles(REQUIRED_TRAILING_SESSIONS + 1, {
      [5]: { high: 100, low: 10 },
      [REQUIRED_TRAILING_SESSIONS]: { high: 100, low: 50 },
    });
    const result = evaluateSymbolOnDate(candles, REQUIRED_TRAILING_SESSIONS);
    expect(result.newLow).toBe(false);
  });

  it('can flag both new high and new low on the same day (huge range bar)', () => {
    const candles = buildCandles(REQUIRED_TRAILING_SESSIONS + 1, {
      [REQUIRED_TRAILING_SESSIONS]: { high: 1000, low: 1 },
    });
    const result = evaluateSymbolOnDate(candles, REQUIRED_TRAILING_SESSIONS);
    expect(result.newHigh).toBe(true);
    expect(result.newLow).toBe(true);
  });

  it('is idempotent across repeated calls with the same input', () => {
    const candles = buildCandles(REQUIRED_TRAILING_SESSIONS + 5);
    const first = evaluateSymbolOnDate(candles, REQUIRED_TRAILING_SESSIONS + 2);
    const second = evaluateSymbolOnDate(
      candles,
      REQUIRED_TRAILING_SESSIONS + 2,
    );
    expect(second).toEqual(first);
  });
});

describe('aggregateDay', () => {
  it('counts only evaluable results toward universeSize/newHighs/newLows', () => {
    const result = aggregateDay({
      totalUniverseSize: 10,
      missingSymbolCount: 0,
      evaluableResults: [
        { evaluable: true, newHigh: true, newLow: false },
        { evaluable: true, newHigh: false, newLow: true },
        { evaluable: true, newHigh: false, newLow: false },
      ],
    });

    expect(result.universeSize).toBe(3);
    expect(result.newHighs).toBe(1);
    expect(result.newLows).toBe(1);
  });

  it('is not partial at or below the 5% missing threshold', () => {
    const result = aggregateDay({
      totalUniverseSize: 100,
      missingSymbolCount: Math.floor(100 * PARTIAL_RUN_MISSING_THRESHOLD),
      evaluableResults: [],
    });
    expect(result.partial).toBe(false);
  });

  it('is partial when missing exceeds the 5% threshold', () => {
    const result = aggregateDay({
      totalUniverseSize: 100,
      missingSymbolCount: 6,
      evaluableResults: [],
    });
    expect(result.partial).toBe(true);
  });

  it('is not partial when the universe is empty', () => {
    const result = aggregateDay({
      totalUniverseSize: 0,
      missingSymbolCount: 0,
      evaluableResults: [],
    });
    expect(result.partial).toBe(false);
  });
});
