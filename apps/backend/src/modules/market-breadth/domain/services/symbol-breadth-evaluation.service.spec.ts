import {
  aggregateDay,
  BreadthCandle,
  evaluateSymbolOnDate,
  PARTIAL_RUN_MISSING_THRESHOLD,
  REQUIRED_TRAILING_SESSIONS,
  SymbolDayResult,
} from './symbol-breadth-evaluation.service';

function buildCandles(
  count: number,
  overrides: Record<number, Partial<BreadthCandle>> = {},
  closeAt: (index: number) => number = () => 95,
): BreadthCandle[] {
  const candles: BreadthCandle[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(2020, 0, 1 + i).toISOString().split('T')[0];
    candles.push({
      date,
      high: 100,
      low: 90,
      close: closeAt(i),
      ...overrides[i],
    });
  }
  return candles;
}

function result(overrides: Partial<SymbolDayResult>): SymbolDayResult {
  return {
    evaluable: true,
    newHigh: false,
    newLow: false,
    stacked: false,
    ...overrides,
  };
}

describe('evaluateSymbolOnDate', () => {
  it('excludes symbols with fewer than 252 prior sessions', () => {
    const candles = buildCandles(REQUIRED_TRAILING_SESSIONS);
    const result = evaluateSymbolOnDate(
      candles,
      REQUIRED_TRAILING_SESSIONS - 1,
    );
    expect(result).toEqual({
      evaluable: false,
      newHigh: false,
      newLow: false,
      stacked: false,
    });
  });

  it('is not evaluable for stacked either when below 252 prior sessions, even on a rising series', () => {
    const rising = buildCandles(REQUIRED_TRAILING_SESSIONS, {}, (i) => 100 + i);
    const result = evaluateSymbolOnDate(rising, REQUIRED_TRAILING_SESSIONS - 1);
    expect(result.evaluable).toBe(false);
    expect(result.stacked).toBe(false);
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

  it('flags stacked on a steadily rising close series', () => {
    const rising = buildCandles(
      REQUIRED_TRAILING_SESSIONS + 1,
      {},
      (i) => 100 + i,
    );
    const result = evaluateSymbolOnDate(rising, REQUIRED_TRAILING_SESSIONS);
    expect(result.evaluable).toBe(true);
    expect(result.stacked).toBe(true);
  });

  it('does not flag stacked on a flat close series (all averages equal)', () => {
    const flat = buildCandles(REQUIRED_TRAILING_SESSIONS + 1);
    const result = evaluateSymbolOnDate(flat, REQUIRED_TRAILING_SESSIONS);
    expect(result.evaluable).toBe(true);
    expect(result.stacked).toBe(false);
  });

  it('does not flag stacked on a steadily falling close series', () => {
    const falling = buildCandles(
      REQUIRED_TRAILING_SESSIONS + 1,
      {},
      (i) => 1000 - i,
    );
    const result = evaluateSymbolOnDate(falling, REQUIRED_TRAILING_SESSIONS);
    expect(result.stacked).toBe(false);
  });

  it('stays stacked when the close on D wobbles below EMA9 but above EMA21', () => {
    const wobble = buildCandles(
      REQUIRED_TRAILING_SESSIONS + 1,
      { [REQUIRED_TRAILING_SESSIONS]: { close: 345 } },
      (i) => 100 + i,
    );
    const result = evaluateSymbolOnDate(wobble, REQUIRED_TRAILING_SESSIONS);
    expect(result.stacked).toBe(true);
  });

  it('does not flag stacked when the close on D drops below EMA21 after a rise', () => {
    const rolledOver = buildCandles(
      REQUIRED_TRAILING_SESSIONS + 1,
      { [REQUIRED_TRAILING_SESSIONS]: { close: 300 } },
      (i) => 100 + i,
    );
    const result = evaluateSymbolOnDate(rolledOver, REQUIRED_TRAILING_SESSIONS);
    expect(result.stacked).toBe(false);
  });

  it('is evaluable but not stacked when a short window leaves fewer than 50 closes', () => {
    const rising = buildCandles(20, {}, (i) => 100 + i);
    const result = evaluateSymbolOnDate(rising, 19, 10);
    expect(result.evaluable).toBe(true);
    expect(result.stacked).toBe(false);
  });

  it('computes new high/low and stacked from the same candles in one call', () => {
    const risingBreakout = buildCandles(
      REQUIRED_TRAILING_SESSIONS + 1,
      { [REQUIRED_TRAILING_SESSIONS]: { high: 500, low: 95 } },
      (i) => 100 + i,
    );
    const result = evaluateSymbolOnDate(
      risingBreakout,
      REQUIRED_TRAILING_SESSIONS,
    );
    expect(result).toEqual({
      evaluable: true,
      newHigh: true,
      newLow: false,
      stacked: true,
    });
  });

  it('is idempotent across repeated calls with the same input', () => {
    const candles = buildCandles(
      REQUIRED_TRAILING_SESSIONS + 5,
      {},
      (i) => 100 + i,
    );
    const first = evaluateSymbolOnDate(candles, REQUIRED_TRAILING_SESSIONS + 2);
    const second = evaluateSymbolOnDate(
      candles,
      REQUIRED_TRAILING_SESSIONS + 2,
    );
    expect(second).toEqual(first);
  });
});

describe('aggregateDay', () => {
  it('counts only evaluable results toward universeSize/newHighs/newLows/stackedCount', () => {
    const output = aggregateDay({
      totalUniverseSize: 10,
      missingSymbolCount: 0,
      evaluableResults: [
        result({ newHigh: true, stacked: true }),
        result({ newLow: true }),
        result({ stacked: true }),
        result({}),
      ],
    });

    expect(output.universeSize).toBe(4);
    expect(output.newHighs).toBe(1);
    expect(output.newLows).toBe(1);
    expect(output.stackedCount).toBe(2);
  });

  it('reports zero stackedCount when no result is stacked', () => {
    const output = aggregateDay({
      totalUniverseSize: 2,
      missingSymbolCount: 0,
      evaluableResults: [result({ newHigh: true }), result({})],
    });
    expect(output.stackedCount).toBe(0);
  });

  it('is not partial at or below the 5% missing threshold', () => {
    const output = aggregateDay({
      totalUniverseSize: 100,
      missingSymbolCount: Math.floor(100 * PARTIAL_RUN_MISSING_THRESHOLD),
      evaluableResults: [],
    });
    expect(output.partial).toBe(false);
  });

  it('is partial when missing exceeds the 5% threshold', () => {
    const output = aggregateDay({
      totalUniverseSize: 100,
      missingSymbolCount: 6,
      evaluableResults: [],
    });
    expect(output.partial).toBe(true);
  });

  it('is not partial when the universe is empty', () => {
    const output = aggregateDay({
      totalUniverseSize: 0,
      missingSymbolCount: 0,
      evaluableResults: [],
    });
    expect(output.partial).toBe(false);
  });
});
