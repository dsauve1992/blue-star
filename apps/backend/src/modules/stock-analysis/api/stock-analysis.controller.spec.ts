import type { Server } from 'http';
import { INestApplication, NotFoundException } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DomainErrorFilter } from '../../../common/filters/domain-error.filter';
import { QueryConsolidationAnalysisAnalyzeUseCase } from '../use-cases/query-consolidation-analysis-analyze-use.case';
import { QueryIndustryGroupRatingsUseCase } from '../use-cases/query-industry-group-ratings.use-case';
import { QueryIndustryGroupsUseCase } from '../use-cases/query-industry-groups.use-case';
import { QueryMomentumLeadersUseCase } from '../use-cases/query-momentum-leaders.use-case';
import { QueryRsRatingsUseCase } from '../use-cases/query-rs-ratings.use-case';
import { RunConsolidationAnalysisUseCase } from '../use-cases/run-consolidation-analysis.use-case';
import { RunIndustryGroupRsRatingsUseCase } from '../use-cases/run-industry-group-rs-ratings.use-case';
import { RunMomentumLeadersUseCase } from '../use-cases/run-momentum-leaders.use-case';
import { RunRsRatingsUseCase } from '../use-cases/run-rs-ratings.use-case';
import { StockAnalysisController } from './stock-analysis.controller';

describe('StockAnalysisController', () => {
  let app: INestApplication;
  let server: Server;
  let queryMomentumLeaders: { execute: jest.Mock };
  let runMomentumLeaders: { execute: jest.Mock };
  let queryIndustryGroupRatings: { execute: jest.Mock };
  let runRsRatings: { execute: jest.Mock };
  let runIndustryGroupRsRatings: { execute: jest.Mock };

  beforeEach(async () => {
    queryMomentumLeaders = { execute: jest.fn() };
    runMomentumLeaders = { execute: jest.fn() };
    queryIndustryGroupRatings = { execute: jest.fn() };
    runRsRatings = { execute: jest.fn() };
    runIndustryGroupRsRatings = { execute: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [StockAnalysisController],
      providers: [
        { provide: APP_FILTER, useClass: DomainErrorFilter },
        {
          provide: QueryConsolidationAnalysisAnalyzeUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: RunConsolidationAnalysisUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: QueryRsRatingsUseCase, useValue: { execute: jest.fn() } },
        { provide: RunRsRatingsUseCase, useValue: runRsRatings },
        {
          provide: RunIndustryGroupRsRatingsUseCase,
          useValue: runIndustryGroupRsRatings,
        },
        {
          provide: QueryIndustryGroupsUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: QueryIndustryGroupRatingsUseCase,
          useValue: queryIndustryGroupRatings,
        },
        {
          provide: QueryMomentumLeadersUseCase,
          useValue: queryMomentumLeaders,
        },
        { provide: RunMomentumLeadersUseCase, useValue: runMomentumLeaders },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await app.close();
  });

  it('returns 500 when the momentum leaders query throws an unexpected error', async () => {
    queryMomentumLeaders.execute.mockRejectedValue(new Error('db down'));

    await request(server).get('/stock-analysis/momentum-leaders').expect(500);
  });

  it('returns 500 when the momentum leaders run throws an unexpected error', async () => {
    runMomentumLeaders.execute.mockRejectedValue(new Error('screener crashed'));

    await request(server)
      .post('/stock-analysis/momentum-leaders/run')
      .expect(500);
  });

  it('returns 400 when consolidations type is missing', async () => {
    const response = await request(server)
      .get('/stock-analysis/consolidations')
      .expect(400);

    expect((response.body as { message: string }).message).toContain(
      '"daily" or "weekly"',
    );
  });

  it('returns 400 when rs-ratings symbols is empty', async () => {
    const response = await request(server)
      .get('/stock-analysis/rs-ratings?symbols=')
      .expect(400);

    expect((response.body as { message: string }).message).toContain(
      'symbols query parameter is required',
    );
  });

  it('keeps the 404 when the industry group is not found', async () => {
    queryIndustryGroupRatings.execute.mockRejectedValue(
      new NotFoundException('Industry group Foo not found'),
    );

    await request(server)
      .get('/stock-analysis/industry-groups/Foo/rs-ratings')
      .expect(404);

    expect(queryIndustryGroupRatings.execute).toHaveBeenCalledWith({
      industryGroup: 'Foo',
    });
  });

  it('returns 201 with a warning when only the industry-group step fails', async () => {
    runRsRatings.execute.mockResolvedValue(undefined);
    runIndustryGroupRsRatings.execute.mockRejectedValue(new Error('boom'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await request(server)
      .post('/stock-analysis/rs-ratings/run')
      .expect(201);

    expect(runRsRatings.execute).toHaveBeenCalled();
    expect((response.body as { message: string }).message).toContain(
      'industry-group RS ratings failed',
    );
  });
});
