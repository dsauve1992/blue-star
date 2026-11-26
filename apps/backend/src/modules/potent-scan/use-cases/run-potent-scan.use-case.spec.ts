import { Test } from '@nestjs/testing';
import { RunPotentScanUseCase } from './run-potent-scan.use-case';
import type { PotentScanRepository } from '../domain/repositories/potent-scan.repository.interface';
import type { PotentScreenerService } from '../domain/services/potent-screener.service';
import type { SessionCalendar } from '../domain/services/session-calendar.service';
import {
  POTENT_SCAN_REPOSITORY,
  POTENT_SCREENER_SERVICE,
  SESSION_CALENDAR,
} from '../constants/tokens';
import { PotentScan } from '../domain/entities/potent-scan';
import { SessionDate } from '../domain/value-objects/session-date';
import { InvariantError, StateError } from '../domain/domain-errors';
import { hit, nearMiss } from '../test/fixtures';

describe('RunPotentScanUseCase', () => {
  let useCase: RunPotentScanUseCase;
  let calendar: jest.Mocked<SessionCalendar>;
  let screener: jest.Mocked<PotentScreenerService>;
  let repository: jest.Mocked<PotentScanRepository>;

  const session = SessionDate.of('2026-11-25');

  beforeEach(async () => {
    calendar = { lastCompletedSession: jest.fn().mockResolvedValue(session) };
    screener = {
      scan: jest.fn().mockResolvedValue({
        universeSize: 2400,
        hits: [hit('AAA'), hit('BBB')],
        nearMisses: [nearMiss('CCC')],
      }),
    };
    repository = {
      replace: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn().mockResolvedValue(false),
      findBySessionDate: jest.fn(),
      findLatest: jest.fn(),
      listSessionDates: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        RunPotentScanUseCase,
        { provide: SESSION_CALENDAR, useValue: calendar },
        { provide: POTENT_SCREENER_SERVICE, useValue: screener },
        { provide: POTENT_SCAN_REPOSITORY, useValue: repository },
      ],
    }).compile();

    useCase = module.get(RunPotentScanUseCase);
  });

  it('should store the scan under the last completed session date', async () => {
    await useCase.execute({ replaceExisting: false });

    expect(repository.replace).toHaveBeenNthCalledWith(
      1,
      PotentScan.of({
        sessionDate: session,
        universeSize: 2400,
        hits: [hit('AAA'), hit('BBB')],
        nearMisses: [nearMiss('CCC')],
      }),
    );
  });

  it('should refuse to scan a session that is already stored when not replacing', async () => {
    repository.exists.mockResolvedValue(true);

    await expect(useCase.execute({ replaceExisting: false })).rejects.toThrow(
      new StateError(
        'No new session: the last completed session 2026-11-25 is already scanned',
      ),
    );
    expect(screener.scan).not.toHaveBeenCalled();
    expect(repository.replace).not.toHaveBeenCalled();
  });

  it('should replace a stored session when replacing', async () => {
    repository.exists.mockResolvedValue(true);

    await useCase.execute({ replaceExisting: true });

    expect(repository.replace).toHaveBeenNthCalledWith(
      1,
      PotentScan.of({
        sessionDate: session,
        universeSize: 2400,
        hits: [hit('AAA'), hit('BBB')],
        nearMisses: [nearMiss('CCC')],
      }),
    );
  });

  it('should store nothing when the scan has no hits', async () => {
    screener.scan.mockResolvedValue({
      universeSize: 2400,
      hits: [],
      nearMisses: [nearMiss('CCC')],
    });

    await expect(useCase.execute({ replaceExisting: true })).rejects.toThrow(
      InvariantError,
    );
    expect(repository.replace).not.toHaveBeenCalled();
  });

  it('should store nothing when the screener fails', async () => {
    screener.scan.mockRejectedValue(new Error('Potent scan screener error'));

    await expect(useCase.execute({ replaceExisting: true })).rejects.toThrow(
      'Potent scan screener error',
    );
    expect(repository.replace).not.toHaveBeenCalled();
  });
});
