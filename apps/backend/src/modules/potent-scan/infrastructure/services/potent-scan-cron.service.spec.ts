import { Test } from '@nestjs/testing';
import { PotentScanCronService } from './potent-scan-cron.service';
import { RunPotentScanUseCase } from '../../use-cases/run-potent-scan.use-case';
import { CronJobNotificationService } from '../../../notification/notification.module';
import { SessionDate } from '../../domain/value-objects/session-date';
import { StateError } from '../../domain/domain-errors';

describe('PotentScanCronService', () => {
  let cron: PotentScanCronService;
  let runPotentScan: { execute: jest.Mock };
  let notifications: jest.Mocked<
    Pick<
      CronJobNotificationService,
      'notifyJobStart' | 'notifyJobSuccess' | 'notifyJobError'
    >
  >;

  const job = {
    jobName: 'Daily Potent Scan',
    jobType: 'potent-scan',
    frequency: 'daily',
  };

  beforeEach(async () => {
    runPotentScan = {
      execute: jest.fn().mockResolvedValue({
        sessionDate: SessionDate.of('2026-11-25'),
        hitCount: 40,
      }),
    };
    notifications = {
      notifyJobStart: jest.fn().mockResolvedValue(undefined),
      notifyJobSuccess: jest.fn().mockResolvedValue(undefined),
      notifyJobError: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        PotentScanCronService,
        { provide: RunPotentScanUseCase, useValue: runPotentScan },
        { provide: CronJobNotificationService, useValue: notifications },
      ],
    }).compile();

    cron = module.get(PotentScanCronService);
  });

  it('should scan only a new session and report success', async () => {
    await cron.runDailyScan();

    expect(runPotentScan.execute).toHaveBeenNthCalledWith(1, {
      replaceExisting: false,
    });
    expect(notifications.notifyJobStart).toHaveBeenNthCalledWith(1, job);
    expect(notifications.notifyJobSuccess).toHaveBeenNthCalledWith(1, job);
    expect(notifications.notifyJobError).not.toHaveBeenCalled();
  });

  it('should report an already scanned session as an error, never a success', async () => {
    const error = new StateError(
      'No new session: the last completed session 2026-11-25 is already scanned',
    );
    runPotentScan.execute.mockRejectedValue(error);

    await cron.runDailyScan();

    expect(notifications.notifyJobError).toHaveBeenNthCalledWith(1, job, error);
    expect(notifications.notifyJobSuccess).not.toHaveBeenCalled();
  });
});
