import { LeaderScanCronService } from './leader-scan-cron.service';
import type { CronJobNotificationService } from '../../../notification/notification.module';
import type { LeaderScanAnalysisService } from '../../domain/services/leader-scan-analysis.service';

describe('LeaderScanCronService', () => {
  const job = {
    jobName: 'Weekly Leader Scan',
    jobType: 'leader-scan',
    frequency: 'weekly',
  };

  let service: LeaderScanCronService;
  let analysisService: jest.Mocked<LeaderScanAnalysisService>;
  let notifyJobStart: jest.Mock;
  let notifyJobSuccess: jest.Mock;
  let notifyJobError: jest.Mock;

  beforeEach(() => {
    analysisService = {
      runAnalysis: jest
        .fn()
        .mockResolvedValue({ leaderCount: 12, universeSize: 340 }),
    } as unknown as jest.Mocked<LeaderScanAnalysisService>;
    notifyJobStart = jest.fn().mockResolvedValue(undefined);
    notifyJobSuccess = jest.fn().mockResolvedValue(undefined);
    notifyJobError = jest.fn().mockResolvedValue(undefined);
    service = new LeaderScanCronService(analysisService, {
      notifyJobStart,
      notifyJobSuccess,
      notifyJobError,
    } as unknown as CronJobNotificationService);
  });

  it('notifies start then success with the leader and universe counts', async () => {
    await service.runWeeklyScan();

    expect(notifyJobStart).toHaveBeenCalledWith(job);
    expect(notifyJobSuccess).toHaveBeenCalledWith({
      ...job,
      additionalData: '12 leaders / 340 universe',
    });
    expect(notifyJobStart.mock.invocationCallOrder[0]).toBeLessThan(
      notifyJobSuccess.mock.invocationCallOrder[0],
    );
    expect(notifyJobError).not.toHaveBeenCalled();
  });

  it('alerts and swallows a failed analysis without reporting success', async () => {
    const error = new Error('boom');
    analysisService.runAnalysis.mockRejectedValue(error);

    await expect(service.runWeeklyScan()).resolves.toBeUndefined();

    expect(notifyJobError).toHaveBeenCalledWith(job, error);
    expect(notifyJobSuccess).not.toHaveBeenCalled();
  });
});
