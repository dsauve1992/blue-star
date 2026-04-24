import { ScanDate } from '../value-objects/scan-date';
import { LeaderScanRunStatus } from '../value-objects/leader-scan-run-status';
import { StateError } from '../domain-errors';

export interface LeaderScanRunData {
  id: string;
  scanDate: ScanDate;
  status: LeaderScanRunStatus;
  universeSize?: number;
  leaderCount?: number;
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
}

export class LeaderScanRun {
  private constructor(
    public readonly id: string,
    public readonly scanDate: ScanDate,
    private _status: LeaderScanRunStatus,
    public readonly startedAt: Date,
    private _universeSize?: number,
    private _leaderCount?: number,
    private _errorMessage?: string,
    private _completedAt?: Date,
  ) {}

  static create(scanDate: ScanDate): LeaderScanRun {
    return new LeaderScanRun(
      crypto.randomUUID(),
      scanDate,
      LeaderScanRunStatus.RUNNING,
      new Date(),
    );
  }

  static fromData(data: LeaderScanRunData): LeaderScanRun {
    return new LeaderScanRun(
      data.id,
      data.scanDate,
      data.status,
      data.startedAt,
      data.universeSize,
      data.leaderCount,
      data.errorMessage,
      data.completedAt,
    );
  }

  markCompleted(universeSize: number, leaderCount: number): void {
    if (this._status !== LeaderScanRunStatus.RUNNING) {
      throw new StateError(`Cannot complete run in status ${this._status}`);
    }
    this._status = LeaderScanRunStatus.COMPLETED;
    this._universeSize = universeSize;
    this._leaderCount = leaderCount;
    this._completedAt = new Date();
  }

  markFailed(errorMessage: string): void {
    this._status = LeaderScanRunStatus.FAILED;
    this._errorMessage = errorMessage;
    this._completedAt = new Date();
  }

  get status(): LeaderScanRunStatus {
    return this._status;
  }

  get universeSize(): number | undefined {
    return this._universeSize;
  }

  get leaderCount(): number | undefined {
    return this._leaderCount;
  }

  get errorMessage(): string | undefined {
    return this._errorMessage;
  }

  get completedAt(): Date | undefined {
    return this._completedAt;
  }
}
