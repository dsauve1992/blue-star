import { Test } from '@nestjs/testing';
import { PotentScanCronService } from './potent-scan-cron.service';
import { RunPotentScanUseCase } from '../../use-cases/run-potent-scan.use-case';
import { ResearchPotentHitsUseCase } from '../../use-cases/research-potent-hits.use-case';
import { TrackMemberTiersUseCase } from '../../use-cases/track-member-tiers.use-case';
import { ProposeClustersUseCase } from '../../use-cases/propose-clusters.use-case';
import { CronJobNotificationService } from '../../../notification/notification.module';
import { SessionDate } from '../../domain/value-objects/session-date';
import { StateError } from '../../domain/domain-errors';

describe('PotentScanCronService', () => {
  let cron: PotentScanCronService;
  let runPotentScan: { execute: jest.Mock };
  let researchHits: { execute: jest.Mock };
  let trackMemberTiers: { execute: jest.Mock };
  let proposeClusters: { execute: jest.Mock };
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
  const researchJob = {
    jobName: 'Potent Hit Research',
    jobType: 'potent-hit-research',
    frequency: 'daily',
  };
  const proposalsJob = {
    jobName: 'Potent Cluster Proposals',
    jobType: 'potent-cluster-proposals',
    frequency: 'daily',
  };

  beforeEach(async () => {
    runPotentScan = {
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
          inputTokens: 90000,
          outputTokens: 12000,
          webSearchRequests: 9,
          costUsd: 0.10512,
        },
      }),
    };
    trackMemberTiers = {
      execute: jest.fn().mockResolvedValue({
        sessionDate: SessionDate.of('2026-11-25'),
        tierCount: 12,
        failures: [],
      }),
    };
    proposeClusters = {
      execute: jest.fn().mockResolvedValue({
        sessionDate: SessionDate.of('2026-11-25'),
        newClusterCount: 2,
        additionCount: 1,
        unclusteredCount: 9,
        droppedCount: 1,
        usage: {
          inputTokens: 20000,
          outputTokens: 3000,
          webSearchRequests: 0,
          costUsd: 0.07,
        },
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
        { provide: ResearchPotentHitsUseCase, useValue: researchHits },
        { provide: TrackMemberTiersUseCase, useValue: trackMemberTiers },
        { provide: ProposeClustersUseCase, useValue: proposeClusters },
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

  it('should research the scanned session after a successful scan and report its cost', async () => {
    await cron.runDailyScan();

    expect(researchHits.execute).toHaveBeenNthCalledWith(1, {
      sessionDate: SessionDate.of('2026-11-25'),
    });
    expect(notifications.notifyJobStart).toHaveBeenNthCalledWith(
      2,
      researchJob,
    );
    expect(notifications.notifyJobSuccess).toHaveBeenNthCalledWith(2, {
      ...researchJob,
      additionalData: '40 hits researched for $0.1051',
    });
  });

  it('should not research when the scan fails', async () => {
    runPotentScan.execute.mockRejectedValue(new Error('screener crashed'));

    await cron.runDailyScan();

    expect(researchHits.execute).not.toHaveBeenCalled();
  });

  it('should report a research failure as its own error and keep the scan success', async () => {
    const error = new StateError('Potent research is incomplete');
    researchHits.execute.mockRejectedValue(error);

    await cron.runDailyScan();

    expect(notifications.notifyJobSuccess).toHaveBeenNthCalledWith(1, job);
    expect(notifications.notifyJobSuccess).toHaveBeenCalledTimes(1);
    expect(notifications.notifyJobError).toHaveBeenNthCalledWith(
      1,
      researchJob,
      error,
    );
  });
  it('should propose clusters after a successful research and report it as its own job', async () => {
    await cron.runDailyScan();

    expect(proposeClusters.execute).toHaveBeenNthCalledWith(1, {
      sessionDate: SessionDate.of('2026-11-25'),
    });
    expect(notifications.notifyJobStart).toHaveBeenNthCalledWith(
      3,
      proposalsJob,
    );
    expect(notifications.notifyJobSuccess).toHaveBeenNthCalledWith(3, {
      ...proposalsJob,
      additionalData:
        '2 clusters and 1 additions proposed (1 dropped) for $0.0700. Day total with research: $0.1751',
    });
  });

  it('should not propose clusters when the research fails', async () => {
    researchHits.execute.mockRejectedValue(new StateError('incomplete'));

    await cron.runDailyScan();

    expect(proposeClusters.execute).not.toHaveBeenCalled();
  });

  it('should report a proposals failure as its own error and keep the scan and research successes', async () => {
    const error = new Error('Clustering stopped with refusal');
    proposeClusters.execute.mockRejectedValue(error);

    await cron.runDailyScan();

    expect(notifications.notifyJobSuccess).toHaveBeenCalledTimes(2);
    expect(notifications.notifyJobError).toHaveBeenNthCalledWith(
      1,
      proposalsJob,
      error,
    );
  });

  describe('trackMemberTiers', () => {
    const tierJob = {
      jobName: 'Daily Potent Member Tiers',
      jobType: 'potent-member-tiers',
      frequency: 'daily',
    };

    it('should report success when every ticker was tracked', async () => {
      await cron.trackMemberTiers();

      expect(trackMemberTiers.execute).toHaveBeenNthCalledWith(1);
      expect(notifications.notifyJobStart).toHaveBeenNthCalledWith(1, tierJob);
      expect(notifications.notifyJobSuccess).toHaveBeenNthCalledWith(
        1,
        tierJob,
      );
      expect(notifications.notifyJobError).not.toHaveBeenCalled();
    });

    it('should report a partial failure as an error, never a success', async () => {
      trackMemberTiers.execute.mockResolvedValue({
        sessionDate: SessionDate.of('2026-11-25'),
        tierCount: 10,
        failures: ['AAA: latest daily bar is 2026-11-24, expected 2026-11-25'],
      });

      await cron.trackMemberTiers();

      expect(notifications.notifyJobError).toHaveBeenNthCalledWith(
        1,
        tierJob,
        new Error(
          'Member tiers for 2026-11-25 failed for 1 ticker(s): AAA: latest daily bar is 2026-11-24, expected 2026-11-25',
        ),
      );
      expect(notifications.notifyJobSuccess).not.toHaveBeenCalled();
    });

    it('should report a whole-job failure as an error', async () => {
      const error = new StateError('The 2026-11-26 session is still open');
      trackMemberTiers.execute.mockRejectedValue(error);

      await cron.trackMemberTiers();

      expect(notifications.notifyJobError).toHaveBeenNthCalledWith(
        1,
        tierJob,
        error,
      );
      expect(notifications.notifyJobSuccess).not.toHaveBeenCalled();
    });
  });
});
