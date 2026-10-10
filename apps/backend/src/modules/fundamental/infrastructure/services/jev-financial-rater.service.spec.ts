import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiRaterUnavailableError } from '../../domain/services/ai-financial-rater';
import { AnnualGrowth } from '../../domain/value-objects/annual-growth';
import { FinancialReport } from '../../domain/value-objects/financial-report';
import { QuarterlyGrowth } from '../../domain/value-objects/quarterly-growth';
import { JevFinancialRaterService } from './jev-financial-rater.service';

const LEGEND = {
  '0': 'Weak',
  '1': 'Slow',
  '2': 'Mixed',
  '3': 'Solid',
  '4': 'Elite',
};

function buildReport(latestEps = 1.5): FinancialReport {
  return FinancialReport.of({
    symbol: 'AAPL',
    quarterlyGrowths: [
      QuarterlyGrowth.of({
        quarter: 'Q4',
        year: '2025',
        eps: latestEps,
        revenue: 1000,
        epsGrowthPercent: 50,
        revenueGrowthPercent: 30,
      }),
      QuarterlyGrowth.of({
        quarter: 'Q4',
        year: '2024',
        eps: 1,
        revenue: 800,
        epsGrowthPercent: 10,
        revenueGrowthPercent: 20,
      }),
    ],
    annualGrowths: [
      AnnualGrowth.of({
        year: '2025',
        eps: 4,
        epsGrowthPercent: 40,
        returnOnEquityPercent: 25,
      }),
    ],
  });
}

function buildAnswers(overrides: Record<string, unknown> = {}) {
  return {
    grade: {
      choice: 'B',
      confidence: 0.8,
      probabilities: { A: 0.1, B: 0.6, C: 0.2, D: 0.05, F: 0.05 },
    },
    currentEarnings: { score: 3, confidence: 0.7, legend: LEGEND },
    annualEarnings: { score: 2, confidence: 0.6, legend: LEGEND },
    ...overrides,
  };
}

function respondWith(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('JevFinancialRaterService', () => {
  let configGet: jest.Mock;
  let fetchSpy: jest.SpyInstance;

  function createService(): JevFinancialRaterService {
    return new JevFinancialRaterService({
      get: configGet,
    } as unknown as ConfigService);
  }

  beforeEach(() => {
    configGet = jest.fn().mockReturnValue('test-key');
    fetchSpy = jest.spyOn(global, 'fetch');
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('rate', () => {
    it('maps a well-formed answer to an AI financial rating', async () => {
      fetchSpy.mockResolvedValue(
        respondWith({ model: 'jev-latest', answers: buildAnswers() }),
      );

      const rating = await createService().rate(buildReport());

      expect(rating).toEqual({
        model: 'jev-latest',
        grade: 'B',
        gradeConfidence: 0.8,
        gradeProbabilities: { A: 0.1, B: 0.6, C: 0.2, D: 0.05, F: 0.05 },
        currentEarnings: { scorePercent: 75, confidence: 0.7, label: 'Solid' },
        annualEarnings: { scorePercent: 50, confidence: 0.6, label: 'Mixed' },
      });
    });

    it('throws without calling the API when no API key is configured', async () => {
      configGet.mockReturnValue(undefined);

      await expect(createService().rate(buildReport())).rejects.toThrow(
        AiRaterUnavailableError,
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('throws without leaking the upstream body on a non-OK response', async () => {
      fetchSpy.mockResolvedValue(
        new Response('secret upstream detail', { status: 500 }),
      );

      const error = await createService()
        .rate(buildReport())
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AiRaterUnavailableError);
      expect((error as Error).message).not.toContain('secret upstream detail');
    });

    it('throws when the request times out', async () => {
      fetchSpy.mockRejectedValue(new DOMException('timeout', 'AbortError'));

      await expect(createService().rate(buildReport())).rejects.toThrow(
        AiRaterUnavailableError,
      );
    });

    it('throws when the response is not JSON', async () => {
      fetchSpy.mockResolvedValue(new Response('<html>', { status: 200 }));

      await expect(createService().rate(buildReport())).rejects.toThrow(
        AiRaterUnavailableError,
      );
    });

    it.each([
      [
        'a grade outside A-F',
        buildAnswers({
          grade: {
            choice: 'E',
            confidence: 0.8,
            probabilities: { A: 0.1, B: 0.6, C: 0.2, D: 0.05, F: 0.05 },
          },
        }),
      ],
      [
        'a score answer without a legend',
        buildAnswers({ currentEarnings: { score: 3, confidence: 0.7 } }),
      ],
      [
        'a score above the legend range',
        buildAnswers({
          currentEarnings: { score: 5, confidence: 0.7, legend: LEGEND },
        }),
      ],
      [
        'a negative score',
        buildAnswers({
          annualEarnings: { score: -1, confidence: 0.7, legend: LEGEND },
        }),
      ],
      [
        'a probability above 1',
        buildAnswers({
          grade: {
            choice: 'B',
            confidence: 0.8,
            probabilities: { A: 1.5, B: 0.6, C: 0.2, D: 0.05, F: 0.05 },
          },
        }),
      ],
      [
        'a missing grade probability',
        buildAnswers({
          grade: {
            choice: 'B',
            confidence: 0.8,
            probabilities: { A: 0.1, B: 0.6, C: 0.2, D: 0.05 },
          },
        }),
      ],
    ])('throws on a malformed answer with %s', async (_name, answers) => {
      fetchSpy.mockResolvedValue(respondWith({ model: 'jev-latest', answers }));

      await expect(createService().rate(buildReport())).rejects.toThrow(
        AiRaterUnavailableError,
      );
    });

    it('posts the report with the bearer token and without the rules-based rating', async () => {
      fetchSpy.mockResolvedValue(
        respondWith({ model: 'jev-latest', answers: buildAnswers() }),
      );

      await createService().rate(buildReport());

      const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(init.body as string) as {
        state: Record<string, unknown>;
      };
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual({
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
      });
      expect(body.state.symbol).toBe('AAPL');
      expect(Object.keys(body.state)).toEqual([
        'symbol',
        'quarters',
        'fiscalYears',
      ]);
      expect(init.body).not.toMatch(
        /scorePercent|"points"|"status"|quarterlyEps|epsAcceleration/,
      );
    });
  });

  describe('requestFingerprint', () => {
    it('is stable for identical reports', () => {
      const service = createService();

      expect(service.requestFingerprint(buildReport())).toBe(
        service.requestFingerprint(buildReport()),
      );
    });

    it('is a sha256 hex digest', () => {
      expect(createService().requestFingerprint(buildReport())).toMatch(
        /^[0-9a-f]{64}$/,
      );
    });

    it('differs when an EPS value changes', () => {
      const service = createService();

      expect(service.requestFingerprint(buildReport(1.5))).not.toBe(
        service.requestFingerprint(buildReport(1.6)),
      );
    });
  });
});
