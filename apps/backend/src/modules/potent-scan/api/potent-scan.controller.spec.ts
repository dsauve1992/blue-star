import { Test } from '@nestjs/testing';
import { PotentScanController } from './potent-scan.controller';
import { GetPotentScanUseCase } from '../use-cases/get-potent-scan.use-case';
import { ListPotentScanDatesUseCase } from '../use-cases/list-potent-scan-dates.use-case';
import { RunPotentScanUseCase } from '../use-cases/run-potent-scan.use-case';
import { TrackMemberTiersUseCase } from '../use-cases/track-member-tiers.use-case';
import { SessionDate } from '../domain/value-objects/session-date';
import { InvariantError } from '../domain/domain-errors';

describe('PotentScanController', () => {
  let controller: PotentScanController;
  let getScan: { execute: jest.Mock };
  let runScan: { execute: jest.Mock };
  let trackTiers: { execute: jest.Mock };

  beforeEach(async () => {
    getScan = { execute: jest.fn().mockResolvedValue({}) };
    runScan = {
      execute: jest.fn().mockResolvedValue({
        sessionDate: SessionDate.of('2026-11-25'),
        hitCount: 40,
      }),
    };

    trackTiers = {
      execute: jest.fn().mockResolvedValue({
        sessionDate: SessionDate.of('2026-11-25'),
        tierCount: 6,
        failures: ['BBB: boom'],
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
        { provide: TrackMemberTiersUseCase, useValue: trackTiers },
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

  it('should replace the session scan on a manual run', async () => {
    const result = await controller.runScan();

    expect(runScan.execute).toHaveBeenNthCalledWith(1, {
      replaceExisting: true,
    });
    expect(result).toEqual({ scanDate: '2026-11-25', hitCount: 40 });
  });

  it('should run tier tracking and return its failures', async () => {
    const result = await controller.trackTiers();

    expect(trackTiers.execute).toHaveBeenNthCalledWith(1);
    expect(result).toEqual({
      sessionDate: '2026-11-25',
      tierCount: 6,
      failures: ['BBB: boom'],
    });
  });
});
