import {
  BREADTH_LOOKBACK,
  BreadthRunSample,
  classifyBreadth,
  MIN_RUNS_FOR_CONFIDENCE,
} from './leader-breadth.service';
import { BreadthRegimeValue } from '../value-objects/breadth-regime';

/** Build a chronological run series (oldest first) from leader counts. */
function runsFromCounts(
  counts: number[],
  universeSize = 4000,
): BreadthRunSample[] {
  return counts.map((leaderCount, i) => ({
    // 2026-04-03, 04-10, 04-17, ... weekly, ascending.
    scanDate: `2026-04-${String(3 + i * 7).padStart(2, '0')}`,
    leaderCount,
    universeSize,
  }));
}

describe('classifyBreadth', () => {
  it('returns null when there are no runs', () => {
    expect(classifyBreadth([])).toBeNull();
  });

  describe('regime classification', () => {
    it('is GREEN when the latest count is above the MA and rising', () => {
      // MA of [100,100,100,200] = 125; latest 200 >= 125 and rising.
      const snap = classifyBreadth(runsFromCounts([100, 100, 100, 200]));
      expect(snap?.regime.value).toBe(BreadthRegimeValue.GREEN);
      expect(snap?.direction).toBe('RISING');
    });

    it('is RED when the latest count is below the MA and falling', () => {
      // MA of [200,200,200,100] = 175; latest 100 < 175 and falling.
      const snap = classifyBreadth(runsFromCounts([200, 200, 200, 100]));
      expect(snap?.regime.value).toBe(BreadthRegimeValue.RED);
      expect(snap?.direction).toBe('FALLING');
    });

    it('is YELLOW when above the MA but falling', () => {
      // MA of [100,100,300,200] = 175; latest 200 >= 175 but falling (200<300).
      const snap = classifyBreadth(runsFromCounts([100, 100, 300, 200]));
      expect(snap?.regime.value).toBe(BreadthRegimeValue.YELLOW);
      expect(snap?.direction).toBe('FALLING');
    });

    it('is YELLOW when below the MA but rising', () => {
      // MA of [300,100,100,150] = 162.5; latest 150 < 162.5 but rising (150>100).
      const snap = classifyBreadth(runsFromCounts([300, 100, 100, 150]));
      expect(snap?.regime.value).toBe(BreadthRegimeValue.YELLOW);
      expect(snap?.direction).toBe('RISING');
    });

    it('is YELLOW when flat (latest equals prior)', () => {
      const snap = classifyBreadth(runsFromCounts([100, 120, 150, 150]));
      expect(snap?.direction).toBe('FLAT');
      expect(snap?.regime.value).toBe(BreadthRegimeValue.YELLOW);
    });
  });

  describe('single run', () => {
    it('treats a lone run as FLAT and provisional', () => {
      const snap = classifyBreadth(runsFromCounts([120]));
      expect(snap?.direction).toBe('FLAT');
      expect(snap?.regime.value).toBe(BreadthRegimeValue.YELLOW);
      expect(snap?.breadthMa).toBe(120);
      expect(snap?.sampleSize).toBe(1);
      expect(snap?.provisional).toBe(true);
    });
  });

  describe('moving-average computation', () => {
    it('averages only the lookback window, newest first', () => {
      // 22 runs; lookback caps at BREADTH_LOOKBACK newest. Make the newest
      // 20 all 100 except guarantee the two oldest (dropped) are wildly off.
      const counts = [9999, 9999, ...Array<number>(BREADTH_LOOKBACK).fill(100)];
      const snap = classifyBreadth(runsFromCounts(counts));
      expect(snap?.sampleSize).toBe(BREADTH_LOOKBACK);
      expect(snap?.breadthMa).toBe(100); // the 9999s were outside the window
    });

    it('respects a custom lookback', () => {
      // last 2 of [100,100,400,400] => MA 400.
      const snap = classifyBreadth(runsFromCounts([100, 100, 400, 400]), 2);
      expect(snap?.sampleSize).toBe(2);
      expect(snap?.breadthMa).toBe(400);
    });
  });

  describe('provisional flag', () => {
    it('is provisional below the confidence threshold', () => {
      const snap = classifyBreadth(
        runsFromCounts(Array<number>(MIN_RUNS_FOR_CONFIDENCE - 1).fill(100)),
      );
      expect(snap?.provisional).toBe(true);
    });

    it('is not provisional at or above the confidence threshold', () => {
      const snap = classifyBreadth(
        runsFromCounts(Array<number>(MIN_RUNS_FOR_CONFIDENCE).fill(100)),
      );
      expect(snap?.provisional).toBe(false);
    });
  });

  describe('leaderPct', () => {
    it('divides leaderCount by universeSize for the latest run', () => {
      const snap = classifyBreadth(runsFromCounts([80, 80, 80, 200], 4000));
      expect(snap?.leaderPct).toBeCloseTo(0.05, 6); // 200 / 4000
    });

    it('is zero when universeSize is zero (guards divide-by-zero)', () => {
      const snap = classifyBreadth([
        { scanDate: '2026-04-10', leaderCount: 10, universeSize: 0 },
      ]);
      expect(snap?.leaderPct).toBe(0);
    });
  });

  describe('ordering robustness', () => {
    it('produces the same result regardless of input order', () => {
      const chronological = runsFromCounts([100, 100, 100, 200]);
      const shuffled = [
        chronological[2],
        chronological[0],
        chronological[3],
        chronological[1],
      ];
      const a = classifyBreadth(chronological);
      const b = classifyBreadth(shuffled);
      expect(b?.regime.value).toBe(a?.regime.value);
      expect(b?.leaderCount).toBe(a?.leaderCount);
      expect(b?.breadthMa).toBe(a?.breadthMa);
    });

    it('returns the series oldest-to-newest', () => {
      const snap = classifyBreadth(runsFromCounts([100, 150, 175, 200]));
      const dates = snap?.series.map((p) => p.scanDate) ?? [];
      expect(dates).toEqual([...dates].sort());
      expect(snap?.series[snap.series.length - 1].leaderCount).toBe(200);
    });
  });
});
