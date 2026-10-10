export type CanslimGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export type CanslimCriterionStatus = 'pass' | 'partial' | 'fail' | 'unscored';

export interface CanslimCriterion {
  key: string;
  label: string;
  status: CanslimCriterionStatus;
  points: number | null;
  detail: string;
}

export class CanslimRating {
  private constructor(
    public readonly grade: CanslimGrade | null,
    public readonly scorePercent: number | null,
    public readonly criteria: CanslimCriterion[],
  ) {}

  static of(data: {
    grade: CanslimGrade | null;
    scorePercent: number | null;
    criteria: CanslimCriterion[];
  }): CanslimRating {
    return new CanslimRating(data.grade, data.scorePercent, data.criteria);
  }
}
