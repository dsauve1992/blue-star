import {
  isStacked,
  seededExponentialMovingAverage,
  simpleMovingAverage,
  stackedRatio,
} from './moving-average.service';

describe('simpleMovingAverage', () => {
  it('averages the last `period` values ending at endIndex', () => {
    expect(simpleMovingAverage([1, 2, 3, 4, 5], 3, 4)).toBe(4);
    expect(simpleMovingAverage([1, 2, 3, 4, 5], 3, 2)).toBe(2);
  });

  it('ignores values after endIndex', () => {
    expect(simpleMovingAverage([1, 2, 3, 1000], 3, 2)).toBe(2);
  });

  it('is null when fewer than `period` values precede endIndex', () => {
    expect(simpleMovingAverage([1, 2], 3, 1)).toBeNull();
  });

  it('is null when endIndex is outside the series', () => {
    expect(simpleMovingAverage([1, 2, 3], 3, 3)).toBeNull();
  });
});

describe('seededExponentialMovingAverage', () => {
  it('equals the SMA of the first `period` values at the seed index', () => {
    expect(seededExponentialMovingAverage([1, 2, 3, 100], 3, 2)).toBe(2);
  });

  it('recurses from the seed with k = 2 / (period + 1): EMA3 of [1,2,3,4,5]', () => {
    const closes = [1, 2, 3, 4, 5];
    expect(seededExponentialMovingAverage(closes, 3, 3)).toBe(3);
    expect(seededExponentialMovingAverage(closes, 3, 4)).toBe(4);
  });

  it('matches a hand-computed EMA2 of [10, 20, 40, 10]', () => {
    const closes = [10, 20, 40, 10];
    expect(seededExponentialMovingAverage(closes, 2, 2)).toBeCloseTo(
      95 / 3,
      10,
    );
    expect(seededExponentialMovingAverage(closes, 2, 3)).toBeCloseTo(
      155 / 9,
      10,
    );
  });

  it('is seeded from the start of the series, not from an arbitrary later point', () => {
    const closes = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2];
    const fullSeries = seededExponentialMovingAverage(closes, 3, 12);
    const lateSeed = seededExponentialMovingAverage(closes.slice(10), 3, 2);
    expect(lateSeed).toBe(2);
    expect(fullSeries).toBeLessThan(2);
  });

  it('gives a constant series an EMA equal to that constant', () => {
    const closes = new Array<number>(60).fill(7);
    expect(seededExponentialMovingAverage(closes, 9, 59)).toBeCloseTo(7, 12);
    expect(seededExponentialMovingAverage(closes, 21, 59)).toBeCloseTo(7, 12);
  });

  it('is null when fewer than `period` values precede endIndex', () => {
    expect(seededExponentialMovingAverage([1, 2], 3, 1)).toBeNull();
    expect(seededExponentialMovingAverage([1, 2, 3, 4], 3, 1)).toBeNull();
  });
});

describe('isStacked', () => {
  it('is true when close > EMA21, EMA9 > EMA21 and EMA21 > SMA50', () => {
    expect(isStacked({ close: 4, ema9: 3, ema21: 2, sma50: 1 })).toBe(true);
  });

  it('stays true when close wobbles between EMA21 and EMA9', () => {
    expect(isStacked({ close: 2.5, ema9: 3, ema21: 2, sma50: 1 })).toBe(true);
  });

  it('is false when every value is equal', () => {
    expect(isStacked({ close: 1, ema9: 1, ema21: 1, sma50: 1 })).toBe(false);
  });

  it('is false when close is below EMA21', () => {
    expect(isStacked({ close: 1.5, ema9: 3, ema21: 2, sma50: 1 })).toBe(false);
  });

  it('is false when close equals EMA21', () => {
    expect(isStacked({ close: 2, ema9: 3, ema21: 2, sma50: 1 })).toBe(false);
  });

  it('is false when EMA9 equals EMA21', () => {
    expect(isStacked({ close: 4, ema9: 2, ema21: 2, sma50: 1 })).toBe(false);
  });

  it('is false when EMA21 equals SMA50', () => {
    expect(isStacked({ close: 4, ema9: 3, ema21: 1, sma50: 1 })).toBe(false);
  });

  it('is false when any average is unavailable', () => {
    expect(isStacked({ close: 4, ema9: null, ema21: 2, sma50: 1 })).toBe(false);
    expect(isStacked({ close: 4, ema9: 3, ema21: null, sma50: 1 })).toBe(false);
    expect(isStacked({ close: 4, ema9: 3, ema21: 2, sma50: null })).toBe(false);
  });

  it('is false when the order is inverted anywhere in the chain', () => {
    expect(isStacked({ close: 4, ema9: 1, ema21: 2, sma50: 0 })).toBe(false);
    expect(isStacked({ close: 4, ema9: 3, ema21: 1, sma50: 2 })).toBe(false);
  });
});

describe('stackedRatio', () => {
  it('divides the stacked count by the universe size', () => {
    expect(stackedRatio(850, 3400)).toBeCloseTo(0.25, 5);
  });

  it('is null when the stacked count is null', () => {
    expect(stackedRatio(null, 3400)).toBeNull();
  });

  it('is null when the universe is empty', () => {
    expect(stackedRatio(0, 0)).toBeNull();
  });
});
