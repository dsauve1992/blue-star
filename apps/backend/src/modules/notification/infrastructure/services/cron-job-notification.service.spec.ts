import { CronJobNotificationService } from './cron-job-notification.service';
import { NotificationPriority } from '../../domain/services/notification.service';
import type {
  SendNotificationRequest,
  NotificationService,
} from '../../domain/services/notification.service';

describe('CronJobNotificationService', () => {
  let send: jest.Mock<Promise<void>, [SendNotificationRequest]>;

  const sent = (index: number) => send.mock.calls[index][0];
  let service: CronJobNotificationService;

  beforeEach(() => {
    send = jest.fn<Promise<void>, [SendNotificationRequest]>();
    send.mockResolvedValue(undefined);
    service = new CronJobNotificationService({
      send,
    } as unknown as NotificationService);
  });

  it('sends a long error truncated to 4000 characters with high priority', async () => {
    await service.notifyJobError(
      { jobName: 'job' },
      new Error('x'.repeat(10_000)),
    );

    const { message, priority } = sent(0);
    expect(message.value.length).toBeLessThanOrEqual(4000);
    expect(message.value.startsWith('job failed: xxx')).toBe(true);
    expect(priority).toBe(NotificationPriority.HIGH);
  });

  it('sends a long success payload truncated to 4000 characters', async () => {
    await service.notifyJobSuccess({
      jobName: 'job',
      additionalData: 'y'.repeat(10_000),
    });

    const { message } = sent(0);
    expect(message.value.length).toBeLessThanOrEqual(4000);
  });

  it('leaves short messages unchanged', async () => {
    await service.notifyJobError({ jobName: 'job' }, new Error('boom'));
    await service.notifyJobSuccess({ jobName: 'job', additionalData: '5' });

    expect(sent(0).message.value).toBe('job failed: boom');
    expect(sent(1).message.value).toBe('job completed successfully: 5');
  });

  it('swallows a failing send', async () => {
    send.mockRejectedValue(new Error('ntfy down'));

    await expect(
      service.notifyJobError({ jobName: 'job' }, new Error('boom')),
    ).resolves.toBeUndefined();
  });
});
