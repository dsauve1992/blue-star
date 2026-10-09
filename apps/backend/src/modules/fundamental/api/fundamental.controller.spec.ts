import type { Server } from 'http';
import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DomainErrorFilter } from '../../../common/filters/domain-error.filter';
import { Symbol } from '../../../shared/value-objects/symbol';
import { FinancialReport } from '../domain/value-objects/financial-report';
import { ComputeFinancialReportUseCase } from '../use-cases/compute-financial-report.use-case';
import { FundamentalApiMapper } from './fundamental-api.mapper';
import { FundamentalController } from './fundamental.controller';

describe('FundamentalController', () => {
  let app: INestApplication;
  const execute = jest.fn();
  const server = () => app.getHttpServer() as Server;

  beforeEach(async () => {
    execute.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [FundamentalController],
      providers: [
        FundamentalApiMapper,
        { provide: ComputeFinancialReportUseCase, useValue: { execute } },
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
      report: FinancialReport.of({ symbol: 'AAPL', quarterlyGrowths: [] }),
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
});
