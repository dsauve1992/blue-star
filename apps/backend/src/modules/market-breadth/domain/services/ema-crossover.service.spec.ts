import {
  classifyCrossover,
  emaCrossoverSeries,
  trailingExponentialAverages,
} from './ema-crossover.service';

describe('trailingExponentialAverages', () => {
  it('seeds with the first ratio and smooths each following ratio', () => {
    const averages = trailingExponentialAverages([0.2, 0.4, 0.6], 3);

    expect(averages[0]).toBeCloseTo(0.2, 5);
    expect(averages[1]).toBeCloseTo(0.3, 5);
    expect(averages[2]).toBeCloseTo(0.45, 5);
  });

  it('carries the previous average through sessions without a ratio', () => {
    const averages = trailingExponentialAverages([0.2, null, 0.6], 3);

    expect(averages[1]).toBeCloseTo(0.2, 5);
    expect(averages[2]).toBeCloseTo(0.4, 5);
  });

  it('is null until a session with a ratio appears', () => {
    expect(trailingExponentialAverages([null, null, 0.7], 5)).toEqual([
      null,
      null,
      0.7,
    ]);
  });
});

describe('classifyCrossover', () => {
  it('is GOOD when the fast average is above the slow average', () => {
    expect(classifyCrossover(0.3, 0.2)).toBe('GOOD');
  });

  it('is GOOD when the fast average equals the slow average', () => {
    expect(classifyCrossover(0.25, 0.25)).toBe('GOOD');
  });

  it('is BAD when the fast average is below the slow average', () => {
    expect(classifyCrossover(0.2, 0.3)).toBe('BAD');
  });
});

describe('emaCrossoverSeries', () => {
  it('starts both averages at the first ratio', () => {
    const { sessions } = emaCrossoverSeries([0.2, 0.4]);

    expect(sessions[0].ema10).toBeCloseTo(0.2, 5);
    expect(sessions[0].ema20).toBeCloseTo(0.2, 5);
    expect(sessions[1].ema10).toBeCloseTo(0.2 + (0.4 - 0.2) * (2 / 11), 5);
    expect(sessions[1].ema20).toBeCloseTo(0.2 + (0.4 - 0.2) * (2 / 21), 5);
  });

  it('reacts faster on the ten-session average than on the twenty-session one', () => {
    const ratios = [...Array<number>(10).fill(0.3), 0.6, 0.6, 0.6];

    const { sessions } = emaCrossoverSeries(ratios);

    const last = sessions.at(-1)!;
    expect(last.ema10).toBeGreaterThan(last.ema20!);
    expect(last.state).toBe('GOOD');
  });

  it('passes null ratios through and keeps the averages flat', () => {
    const { sessions } = emaCrossoverSeries([0.5, null, 0.6]);

    expect(sessions[1].ratio).toBeNull();
    expect(sessions[1].ema20).toBeCloseTo(0.5, 5);
  });

  it('has no state until two ratios are available', () => {
    const { sessions } = emaCrossoverSeries([null, 0.5, null, 0.6]);

    expect(sessions.map((s) => s.state)).toEqual([null, null, null, 'GOOD']);
  });

  it('flips to GOOD exactly when the fast average equals the slow average', () => {
    const { sessions } = emaCrossoverSeries([0.4, 0.4]);

    expect(sessions[1].ema10).toBe(sessions[1].ema20);
    expect(sessions[1].state).toBe('GOOD');
  });

  it('is BAD when recent ratios fall below the longer average', () => {
    const { sessions } = emaCrossoverSeries([
      0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.3,
    ]);

    expect(sessions[6].state).toBe('BAD');
  });

  it('reports the last session as the headline gauge', () => {
    const ratios = [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.4, 0.5];

    const { sessions, gauge } = emaCrossoverSeries(ratios);

    const last = sessions.at(-1)!;
    expect(gauge).toEqual({
      state: last.state,
      ema10: last.ema10,
      ema20: last.ema20,
      sampleSize: 8,
    });
    expect(gauge?.state).toBe('GOOD');
  });

  it('caps the headline sample size at the slow window', () => {
    const { gauge } = emaCrossoverSeries(Array<number>(30).fill(0.5));

    expect(gauge?.sampleSize).toBe(20);
  });

  it('has no headline gauge when the latest session has no state', () => {
    expect(emaCrossoverSeries([]).gauge).toBeNull();
    expect(emaCrossoverSeries([null, null]).gauge).toBeNull();
    expect(emaCrossoverSeries([0.5]).gauge).toBeNull();
  });
});
