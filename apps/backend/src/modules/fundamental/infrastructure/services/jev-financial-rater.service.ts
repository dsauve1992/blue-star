import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiDimensionScore,
  AiFinancialRater,
  AiFinancialRating,
  AiRaterUnavailableError,
} from '../../domain/services/ai-financial-rater';
import { FinancialReport } from '../../domain/value-objects/financial-report';
import { CanslimGrade } from '../../domain/value-objects/canslim-rating';
import { findPriorYearQuarter } from '../../domain/canslim-rating-calculator';

const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';
const TYPESAFE_TIMEOUT_MS = 10_000;
const MODEL = 'jev-latest';

const CANSLIM_RULES = [
  'C (current quarterly earnings): the latest quarter EPS should be up at least 25% versus the same quarter a year earlier, revenue should be up at least 25% or accelerating over the last 3 quarters, and EPS growth should be accelerating over recent quarters. A slowdown in the most recent 1-2 quarters is a warning; a single dip in the middle of a rising trend is noise.',
  'A (annual earnings): annual EPS should have grown at least 25% in each of the last 3 years, and return on equity should be at least 17%. One down year is tolerable if EPS is back at a new high.',
  'A percentage computed from a negative or near-zero prior EPS is not meaningful growth: treat it as a turnaround, not as explosive growth.',
  'Lists are ordered newest first. null means the value could not be computed (missing filing or no comparable period); judge only the evidence present.',
];

const GRADE_CRITERIA: Record<CanslimGrade, string> = {
  A: 'Textbook CANSLIM leader: strong, accelerating quarterly EPS and revenue growth on top of several years of strong annual EPS growth and high return on equity',
  B: 'Strong fundamentals that meet most C and A requirements, with one notable weakness such as mild deceleration, one soft year, or modest ROE',
  C: 'Mixed fundamentals: some genuine growth, but several C or A requirements are missed or unconvincing',
  D: 'Weak fundamentals: growth is slow, inconsistent, or decelerating, and most C and A requirements are missed',
  F: 'Fails CANSLIM: earnings are shrinking or negative with no confirmed turnaround',
};

const CURRENT_EARNINGS_LEVELS = [
  'Quarterly EPS is shrinking or the company is losing money',
  'Quarterly EPS growth is slow or erratic, well below 25%',
  'Quarterly EPS growth is near 25% but not accelerating, or revenue is not confirming it',
  'Quarterly EPS and revenue both grow above 25%, with stable or rising growth rates',
  'Quarterly EPS and revenue growth are well above 25% and clearly accelerating',
];

const ANNUAL_EARNINGS_LEVELS = [
  'Annual EPS has been declining or negative',
  'Annual EPS growth is slow or inconsistent, and return on equity is low',
  'Annual EPS grows, but not 25% every year, or return on equity is below 17%',
  'Annual EPS grew about 25% or more in most of the last 3 years with return on equity near or above 17%',
  'Annual EPS grew well above 25% every one of the last 3 years and return on equity is well above 17%',
];

const GRADES: CanslimGrade[] = ['A', 'B', 'C', 'D', 'F'];

interface ScoreAnswer {
  score: number;
  confidence: number;
  legend: Record<string, string>;
}

interface ChoiceAnswer {
  choice: CanslimGrade;
  confidence: number;
  probabilities: Record<CanslimGrade, number>;
}

@Injectable()
export class JevFinancialRaterService implements AiFinancialRater {
  private readonly logger = new Logger(JevFinancialRaterService.name);
  private readonly apiKey?: string;

  constructor(configService: ConfigService) {
    this.apiKey = configService.get<string>('TYPESAFE_API_KEY');
  }

  requestFingerprint(report: FinancialReport): string {
    return createHash('sha256')
      .update(JSON.stringify(this.buildRequest(report)))
      .digest('hex');
  }

  async rate(report: FinancialReport): Promise<AiFinancialRating> {
    if (!this.apiKey) {
      this.logger.warn('TYPESAFE_API_KEY is not set; AI rating disabled');
      throw new AiRaterUnavailableError('AI rating is not configured');
    }

    let response: Response;
    try {
      response = await fetch(TYPESAFE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.buildRequest(report)),
        signal: AbortSignal.timeout(TYPESAFE_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.warn(
        `Jev request for ${report.symbol} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new AiRaterUnavailableError('AI rating request failed', {
        cause: error,
      });
    }

    if (!response.ok) {
      this.logger.warn(
        `Jev request for ${report.symbol} returned HTTP ${response.status}`,
      );
      throw new AiRaterUnavailableError('AI rating request failed');
    }

    const rating = this.parseResponse(await response.json().catch(() => null));
    if (!rating) {
      this.logger.warn(`Jev returned a malformed answer for ${report.symbol}`);
      throw new AiRaterUnavailableError('AI rating answer was malformed');
    }
    return rating;
  }

  private parseResponse(body: unknown): AiFinancialRating | null {
    if (!isRecord(body) || typeof body.model !== 'string') return null;
    const answers = body.answers;
    if (!isRecord(answers)) return null;

    const grade = parseChoiceAnswer(answers.grade);
    const currentEarnings = parseScoreAnswer(answers.currentEarnings);
    const annualEarnings = parseScoreAnswer(answers.annualEarnings);
    if (!grade || !currentEarnings || !annualEarnings) return null;

    return {
      model: body.model,
      grade: grade.choice,
      gradeConfidence: grade.confidence,
      gradeProbabilities: grade.probabilities,
      currentEarnings,
      annualEarnings,
    };
  }

  private buildRequest(report: FinancialReport) {
    const state = {
      symbol: report.symbol,
      quarters: report.quarterlyGrowths.map((q) => ({
        period: `${q.quarter} ${q.year}`,
        eps: q.eps,
        priorYearEps:
          findPriorYearQuarter(report.quarterlyGrowths, q)?.eps ?? null,
        epsGrowthPercent: round(q.epsGrowthPercent),
        revenueGrowthPercent: round(q.revenueGrowthPercent),
      })),
      fiscalYears: report.annualGrowths.map((y) => ({
        fiscalYear: y.year,
        eps: y.eps,
        epsGrowthPercent: round(y.epsGrowthPercent),
        returnOnEquityPercent: round(y.returnOnEquityPercent),
      })),
    };

    return {
      model: MODEL,
      state,
      questions: {
        grade: {
          type: 'choice',
          instructions: {
            question:
              'Grade the financial history of `symbol` from `quarters` and `fiscalYears` against the CANSLIM C and A criteria in `rules`.',
            rules: CANSLIM_RULES,
          },
          criteria: GRADE_CRITERIA,
        },
        currentEarnings: {
          type: 'score',
          instructions: {
            question:
              'How well do the recent `quarters` satisfy the CANSLIM C criterion described in `rules`?',
            rules: CANSLIM_RULES,
          },
          criteria: CURRENT_EARNINGS_LEVELS,
        },
        annualEarnings: {
          type: 'score',
          instructions: {
            question:
              'How well do the `fiscalYears` satisfy the CANSLIM A criterion described in `rules`?',
            rules: CANSLIM_RULES,
          },
          criteria: ANNUAL_EARNINGS_LEVELS,
        },
      },
    };
  }
}

function round(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isProbability(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && value <= 1;
}

function parseChoiceAnswer(answer: unknown): ChoiceAnswer | null {
  if (!isRecord(answer) || !isRecord(answer.probabilities)) return null;
  const { choice, confidence, probabilities } = answer;
  if (!GRADES.includes(choice as CanslimGrade) || !isProbability(confidence)) {
    return null;
  }
  if (!GRADES.every((grade) => isProbability(probabilities[grade]))) {
    return null;
  }
  return {
    choice: choice as CanslimGrade,
    confidence,
    probabilities: probabilities as Record<CanslimGrade, number>,
  };
}

function parseScoreAnswer(answer: unknown): AiDimensionScore | null {
  if (!isRecord(answer) || !isRecord(answer.legend)) return null;
  const { score, confidence, legend } = answer as unknown as ScoreAnswer;
  const maxLevel = Object.keys(legend).length - 1;
  const label = legend[Math.round(score).toString()];
  if (
    typeof score !== 'number' ||
    !isProbability(confidence) ||
    maxLevel < 1 ||
    score < 0 ||
    score > maxLevel ||
    typeof label !== 'string'
  ) {
    return null;
  }
  return {
    scorePercent: Math.round((score / maxLevel) * 100),
    confidence,
    label,
  };
}
