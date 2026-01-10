import { AnalysisDate } from '../value-objects/analysis-date';
import { ConsolidationRunStatus } from '../value-objects/consolidation-run-status';

export interface ConsolidationRunData {
  id: string;
  timeframe: 'daily' | 'weekly';
  analysisDate: AnalysisDate;
  status: ConsolidationRunStatus;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

export class ConsolidationRun {
  private constructor(
    public readonly id: string,
    public readonly timeframe: 'daily' | 'weekly',
    public readonly analysisDate: AnalysisDate,
    private _status: ConsolidationRunStatus,
    public readonly createdAt: Date,
    private _errorMessage?: string,
    private _completedAt?: Date,
  ) {}

  static create(
    timeframe: 'daily' | 'weekly',
    analysisDate: AnalysisDate,
  ): ConsolidationRun {
    return new ConsolidationRun(
      crypto.randomUUID(),
      timeframe,
      analysisDate,
      ConsolidationRunStatus.RUNNING,
      new Date(),
      undefined,
      undefined,
    );
  }

  static fromData(data: ConsolidationRunData): ConsolidationRun {
    return new ConsolidationRun(
      data.id,
      data.timeframe,
      data.analysisDate,
      data.status,
      data.createdAt,
      data.errorMessage,
      data.completedAt,
    );
  }

  markCompleted(): void {
    this._status = ConsolidationRunStatus.COMPLETED;
    this._completedAt = new Date();
  }

  markFailed(errorMessage: string): void {
    this._status = ConsolidationRunStatus.FAILED;
    this._errorMessage = errorMessage;
    this._completedAt = new Date();
  }

  get status(): ConsolidationRunStatus {
    return this._status;
  }

  get errorMessage(): string | undefined {
    return this._errorMessage;
  }

  get completedAt(): Date | undefined {
    return this._completedAt;
  }
}
