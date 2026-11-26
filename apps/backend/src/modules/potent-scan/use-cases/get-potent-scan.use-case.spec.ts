import { Test } from '@nestjs/testing';
import { GetPotentScanUseCase } from './get-potent-scan.use-case';
import type { PotentScanRepository } from '../domain/repositories/potent-scan.repository.interface';
import { POTENT_SCAN_REPOSITORY } from '../constants/tokens';
import { PotentScan } from '../domain/entities/potent-scan';
import { SessionDate } from '../domain/value-objects/session-date';
import { NotFoundError } from '../domain/domain-errors';
import { GetLatestMomentumLeaderSymbolsUseCase } from '../../stock-analysis/stock-analysis.module';
import { hit, nearMiss } from '../test/fixtures';

describe('GetPotentScanUseCase', () => {
  let useCase: GetPotentScanUseCase;
  let repository: jest.Mocked<PotentScanRepository>;
  let leaders: { execute: jest.Mock };

  const scan = PotentScan.of({
    sessionDate: SessionDate.of('2026-11-25'),
    universeSize: 2400,
    hits: [hit('AAA'), hit('BBB')],
    nearMisses: [nearMiss('CCC')],
  });

  beforeEach(async () => {
    repository = {
      replace: jest.fn(),
      exists: jest.fn(),
      findBySessionDate: jest.fn().mockResolvedValue(scan),
      findLatest: jest.fn().mockResolvedValue(scan),
      listSessionDates: jest.fn(),
    };
    leaders = {
      execute: jest.fn().mockResolvedValue({
        scanDate: new Date('2026-11-25'),
        symbols: ['BBB', 'ZZZ'],
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        GetPotentScanUseCase,
        { provide: POTENT_SCAN_REPOSITORY, useValue: repository },
        { provide: GetLatestMomentumLeaderSymbolsUseCase, useValue: leaders },
      ],
    }).compile();

    useCase = module.get(GetPotentScanUseCase);
  });

  it('should flag hits that are current momentum leaders', async () => {
    const result = await useCase.execute({
      sessionDate: SessionDate.of('2026-11-25'),
    });

    expect(repository.findBySessionDate).toHaveBeenNthCalledWith(
      1,
      SessionDate.of('2026-11-25'),
    );
    expect(result).toEqual({
      scanDate: '2026-11-25',
      universeSize: 2400,
      hits: [
        { ...hit('AAA'), isMomentumLeader: false },
        { ...hit('BBB'), isMomentumLeader: true },
      ],
      nearMisses: [nearMiss('CCC')],
    });
  });

  it('should read the latest scan for "latest"', async () => {
    const result = await useCase.execute({ sessionDate: 'latest' });

    expect(repository.findLatest).toHaveBeenNthCalledWith(1);
    expect(repository.findBySessionDate).not.toHaveBeenCalled();
    expect(result.scanDate).toBe('2026-11-25');
  });

  it('should flag no hit when there are no momentum leaders', async () => {
    leaders.execute.mockResolvedValue(null);

    const result = await useCase.execute({ sessionDate: 'latest' });

    expect(result.hits.map((h) => h.isMomentumLeader)).toEqual([false, false]);
  });

  it('should throw NotFoundError when the session has no scan', async () => {
    repository.findBySessionDate.mockResolvedValue(null);

    await expect(
      useCase.execute({ sessionDate: SessionDate.of('2026-11-20') }),
    ).rejects.toThrow(
      new NotFoundError('No potent scan for session 2026-11-20'),
    );
  });
});
