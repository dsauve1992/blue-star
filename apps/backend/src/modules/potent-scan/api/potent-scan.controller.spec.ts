import { Test } from '@nestjs/testing';
import { PotentScanController } from './potent-scan.controller';
import { GetPotentScanUseCase } from '../use-cases/get-potent-scan.use-case';
import { ListPotentScanDatesUseCase } from '../use-cases/list-potent-scan-dates.use-case';
import { RunPotentScanUseCase } from '../use-cases/run-potent-scan.use-case';
import { ResearchPotentHitsUseCase } from '../use-cases/research-potent-hits.use-case';
import { SessionDate } from '../domain/value-objects/session-date';
import { InvariantError } from '../domain/domain-errors';

describe('PotentScanController', () => {
  let controller: PotentScanController;
  let getScan: { execute: jest.Mock };
  let runScan: { execute: jest.Mock };
  let researchHits: { execute: jest.Mock };

  beforeEach(async () => {
    getScan = { execute: jest.fn().mockResolvedValue({}) };
    runScan = {
      execute: jest.fn().mockResolvedValue({
        sessionDate: SessionDate.of('2026-11-25'),
        hitCount: 40,
      }),
    };
    researchHits = {
      execute: jest.fn().mockResolvedValue({
        sessionDate: SessionDate.of('2026-11-25'),
        researchedCount: 40,
        usage: {
          inputTokens: 100000,
          outputTokens: 10000,
          webSearchRequests: 6,
          costUsd: 0.12,
        },
      }),
    };

    const module = await Test.createTestingModule({
      controllers: [PotentScanController],
      providers: [
        { provide: GetPotentScanUseCase, useValue: getScan },
        {
          provide: ListPotentScanDatesUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: RunPotentScanUseCase, useValue: runScan },
        { provide: ResearchPotentHitsUseCase, useValue: researchHits },
      ],
    }).compile();

    controller = module.get(PotentScanController);
  });

  it('should parse the date param into a session date', async () => {
    await controller.getScan('2026-11-25');

    expect(getScan.execute).toHaveBeenNthCalledWith(1, {
      sessionDate: SessionDate.of('2026-11-25'),
    });
  });

  it('should pass "latest" through', async () => {
    await controller.getScan('latest');

    expect(getScan.execute).toHaveBeenNthCalledWith(1, {
      sessionDate: 'latest',
    });
  });

  it('should reject an invalid date', async () => {
    await expect(controller.getScan('2026-02-30')).rejects.toThrow(
      InvariantError,
    );
    expect(getScan.execute).not.toHaveBeenCalled();
  });

  it('should replace the session scan on a manual run and research it again', async () => {
    const result = await controller.runScan();

    expect(runScan.execute).toHaveBeenNthCalledWith(1, {
      replaceExisting: true,
    });
    expect(researchHits.execute).toHaveBeenNthCalledWith(1, {
      sessionDate: SessionDate.of('2026-11-25'),
    });
    expect(result).toEqual({
      scanDate: '2026-11-25',
      hitCount: 40,
      research: { status: 'succeeded', researchedCount: 40, costUsd: 0.12 },
    });
  });

  it('should keep the manual scan and report the research failure in the response', async () => {
    researchHits.execute.mockRejectedValue(
      new Error('ANTHROPIC_API_KEY is not set'),
    );

    const result = await controller.runScan();

    expect(result).toEqual({
      scanDate: '2026-11-25',
      hitCount: 40,
      research: { status: 'failed', error: 'ANTHROPIC_API_KEY is not set' },
    });
  });

  it('should not research when the manual scan fails', async () => {
    runScan.execute.mockRejectedValue(new Error('screener crashed'));

    await expect(controller.runScan()).rejects.toThrow('screener crashed');
    expect(researchHits.execute).not.toHaveBeenCalled();
  });

  it('should research the hits of the requested session and return the run cost', async () => {
    const result = await controller.researchScan('2026-11-25');

    expect(researchHits.execute).toHaveBeenNthCalledWith(1, {
      sessionDate: SessionDate.of('2026-11-25'),
    });
    expect(result).toEqual({
      scanDate: '2026-11-25',
      researchedCount: 40,
      costUsd: 0.12,
    });
  });

  it('should reject research for an invalid date', async () => {
    await expect(controller.researchScan('2026-13-01')).rejects.toThrow(
      InvariantError,
    );
    expect(researchHits.execute).not.toHaveBeenCalled();
  });
});
