import {
  classifyTrend,
  stackedRatio,
  trendBreadthSeries,
} from './trend-breadth.service';

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

describe('classifyTrend', () => {
  it('is GOOD when the fast average is above the slow average', () => {
    expect(classifyTrend(0.3, 0.2)).toBe('GOOD');
  });

  it('is GOOD when the fast average equals the slow average', () => {
    expect(classifyTrend(0.25, 0.25)).toBe('GOOD');
  });

  it('is BAD when the fast average is below the slow average', () => {
    expect(classifyTrend(0.2, 0.3)).toBe('BAD');
  });
});

describe('trendBreadthSeries', () => {
  it('uses partial windows at the start of the series', () => {
    const { sessions } = trendBreadthSeries([0.2, 0.4, 0.6]);

    expect(sessions[0].sma5).toBeCloseTo(0.2, 5);
    expect(sessions[0].sma20).toBeCloseTo(0.2, 5);
    expect(sessions[1].sma5).toBeCloseTo(0.3, 5);
    expect(sessions[1].sma20).toBeCloseTo(0.3, 5);
    expect(sessions[2].sma5).toBeCloseTo(0.4, 5);
    expect(sessions[2].sma20).toBeCloseTo(0.4, 5);
  });

  it('averages the last five and last twenty ratios once the windows fill', () => {
    const ratios = Array.from({ length: 25 }, (_, i) => (i + 1) / 100);

    const { sessions } = trendBreadthSeries(ratios);

    expect(sessions[24].sma5).toBeCloseTo((21 + 22 + 23 + 24 + 25) / 500, 5);
    expect(sessions[24].sma20).toBeCloseTo(15.5 / 100, 5);
    expect(sessions[24].state).toBe('GOOD');
  });

  it('passes null ratios through and skips them in the averages', () => {
    const { sessions } = trendBreadthSeries([0.5, null, 0.6, 0.7]);

    expect(sessions[1].ratio).toBeNull();
    expect(sessions[1].sma5).toBeCloseTo(0.5, 5);
    expect(sessions[3].sma5).toBeCloseTo(0.6, 5);
    expect(sessions[3].sma20).toBeCloseTo(0.6, 5);
  });

  it('has no state until two ratios are available', () => {
    const { sessions } = trendBreadthSeries([null, 0.5, null, 0.6]);

    expect(sessions.map((s) => s.state)).toEqual([null, null, null, 'GOOD']);
  });

  it('flips to GOOD exactly when the fast average equals the slow average', () => {
    const { sessions } = trendBreadthSeries([0.4, 0.4]);

    expect(sessions[1].sma5).toBe(sessions[1].sma20);
    expect(sessions[1].state).toBe('GOOD');
  });

  it('is BAD when recent ratios fall below the longer average', () => {
    const { sessions } = trendBreadthSeries([
      0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.3,
    ]);

    expect(sessions[6].state).toBe('BAD');
  });

  it('reports the last session as the headline trend', () => {
    const ratios = [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.4, 0.5];

    const { sessions, trend } = trendBreadthSeries(ratios);

    const last = sessions.at(-1)!;
    expect(trend).toEqual({
      state: last.state,
      sma5: last.sma5,
      sma20: last.sma20,
      sampleSize: 8,
    });
    expect(trend?.state).toBe('GOOD');
  });

  it('caps the headline sample size at the slow window', () => {
    const { trend } = trendBreadthSeries(Array<number>(30).fill(0.5));

    expect(trend?.sampleSize).toBe(20);
  });

  it('has no headline trend when the latest session has no state', () => {
    expect(trendBreadthSeries([]).trend).toBeNull();
    expect(trendBreadthSeries([null, null]).trend).toBeNull();
    expect(trendBreadthSeries([0.5]).trend).toBeNull();
  });
});
