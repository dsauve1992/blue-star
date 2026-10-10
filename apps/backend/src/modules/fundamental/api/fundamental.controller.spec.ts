import type { Server } from 'http';
import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DomainErrorFilter } from '../../../common/filters/domain-error.filter';
import { Symbol } from '../../../shared/value-objects/symbol';
import { NotFoundError } from '../domain/domain-errors';
import { AiRaterUnavailableError } from '../domain/services/ai-financial-rater';
import { FinancialReport } from '../domain/value-objects/financial-report';
import { CanslimRating } from '../domain/value-objects/canslim-rating';
import { ComputeFinancialReportUseCase } from '../use-cases/compute-financial-report.use-case';
import { RateFinancialsWithAiUseCase } from '../use-cases/rate-financials-with-ai.use-case';
import { FundamentalApiMapper } from './fundamental-api.mapper';
import { FundamentalController } from './fundamental.controller';

describe('FundamentalController', () => {
  let app: INestApplication;
  const execute = jest.fn();
  const rateExecute = jest.fn();
  const server = () => app.getHttpServer() as Server;

  beforeEach(async () => {
    execute.mockReset();
    rateExecute.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [FundamentalController],
      providers: [
        FundamentalApiMapper,
        { provide: ComputeFinancialReportUseCase, useValue: { execute } },
        {
          provide: RateFinancialsWithAiUseCase,
          useValue: { execute: rateExecute },
        },
        { provide: APP_FILTER, useClass: DomainErrorFilter },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 500 when the use case fails upstream', async () => {
    execute.mockRejectedValue(
      new Error('SEC companyfacts request failed for AAPL: HTTP 429'),
    );

    await request(server())
      .get('/fundamental/financial-report?symbol=AAPL')
      .expect(500);
  });

  it('returns 400 with the validation message for a malformed symbol', async () => {
    const response = await request(server())
      .get('/fundamental/financial-report?symbol=AA%20PL!')
      .expect(400);

    expect((response.body as { message: string }).message).toContain(
      'Invalid symbol format',
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it('returns 400 with the validation message when the symbol is missing', async () => {
    const response = await request(server())
      .get('/fundamental/financial-report')
      .expect(400);

    expect((response.body as { message: string }).message).toContain(
      'Symbol must be a non-empty string',
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it('returns the mapped report for a valid symbol', async () => {
    execute.mockResolvedValue({
      report: FinancialReport.of({
        symbol: 'AAPL',
        quarterlyGrowths: [],
        annualGrowths: [],
      }),
      rating: CanslimRating.of({
        grade: null,
        scorePercent: null,
        criteria: [],
      }),
    });

    const response = await request(server())
      .get('/fundamental/financial-report?symbol=AAPL')
      .expect(200);

    expect(
      (response.body as { report: { symbol: string } }).report.symbol,
    ).toBe('AAPL');
    expect(execute).toHaveBeenCalledWith({
      symbol: Symbol.of('AAPL'),
    });
  });

  describe('GET /fundamental/ai-rating', () => {
    const rating = {
      model: 'jev-latest',
      grade: 'B',
      gradeConfidence: 0.8,
      gradeProbabilities: { A: 0.1, B: 0.6, C: 0.2, D: 0.05, F: 0.05 },
      currentEarnings: { scorePercent: 75, confidence: 0.7, label: 'Solid' },
      annualEarnings: { scorePercent: 50, confidence: 0.6, label: 'Mixed' },
    };

    it('returns the mapped rating for a valid symbol', async () => {
      rateExecute.mockResolvedValue({ rating });

      const response = await request(server())
        .get('/fundamental/ai-rating?symbol=AAPL')
        .expect(200);

      expect(response.body).toEqual({ rating });
      expect(rateExecute).toHaveBeenNthCalledWith(1, {
        symbol: Symbol.of('AAPL'),
      });
    });

    it('returns 503 when the AI rater is unavailable', async () => {
      rateExecute.mockRejectedValue(
        new AiRaterUnavailableError('AI rating request failed'),
      );

      await request(server())
        .get('/fundamental/ai-rating?symbol=AAPL')
        .expect(503);
    });

    it('returns 404 when there is no financial data to rate', async () => {
      rateExecute.mockRejectedValue(new NotFoundError('No financial data'));

      await request(server())
        .get('/fundamental/ai-rating?symbol=AAPL')
        .expect(404);
    });

    it('returns 400 for a malformed symbol', async () => {
      await request(server())
        .get('/fundamental/ai-rating?symbol=AA%20PL!')
        .expect(400);

      expect(rateExecute).not.toHaveBeenCalled();
    });
  });
});
