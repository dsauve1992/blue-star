import { FinancialReport } from '../value-objects/financial-report';
import { CanslimGrade } from '../value-objects/canslim-rating';

export interface AiDimensionScore {
  scorePercent: number;
  confidence: number;
  label: string;
}

export interface AiFinancialRating {
  model: string;
  grade: CanslimGrade;
  gradeConfidence: number;
  gradeProbabilities: Record<CanslimGrade, number>;
  currentEarnings: AiDimensionScore;
  annualEarnings: AiDimensionScore;
}

export interface AiFinancialRater {
  requestFingerprint(report: FinancialReport): string;
  rate(report: FinancialReport): Promise<AiFinancialRating>;
}

export class AiRaterUnavailableError extends Error {}
