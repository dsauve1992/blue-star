import { LeaderScanRun } from './leader-scan-run';
import { ScanDate } from '../value-objects/scan-date';
import { LeaderScanRunStatus } from '../value-objects/leader-scan-run-status';
import { StateError } from '../domain-errors';

describe('LeaderScanRun', () => {
  it('should create a run in RUNNING state', () => {
    const scanDate = ScanDate.of(new Date('2026-04-24'));
    const run = LeaderScanRun.create(scanDate);

    expect(run.status).toBe(LeaderScanRunStatus.RUNNING);
    expect(run.scanDate).toBe(scanDate);
    expect(run.universeSize).toBeUndefined();
    expect(run.leaderCount).toBeUndefined();
    expect(run.completedAt).toBeUndefined();
  });

  it('should mark a run as completed with universe and leader counts', () => {
    const run = LeaderScanRun.create(ScanDate.today());

    run.markCompleted(3000, 60);

    expect(run.status).toBe(LeaderScanRunStatus.COMPLETED);
    expect(run.universeSize).toBe(3000);
    expect(run.leaderCount).toBe(60);
    expect(run.completedAt).toBeInstanceOf(Date);
  });

  it('should throw StateError when completing a non-running run', () => {
    const run = LeaderScanRun.create(ScanDate.today());
    run.markCompleted(100, 2);

    expect(() => run.markCompleted(100, 2)).toThrow(StateError);
  });

  it('should mark a run as failed with an error message', () => {
    const run = LeaderScanRun.create(ScanDate.today());

    run.markFailed('TradingView timeout');

    expect(run.status).toBe(LeaderScanRunStatus.FAILED);
    expect(run.errorMessage).toBe('TradingView timeout');
    expect(run.completedAt).toBeInstanceOf(Date);
  });
});
