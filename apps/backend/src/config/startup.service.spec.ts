import { StartupService } from './startup.service';
import type { MigrationService } from './migration.service';
import { NotificationPriority } from '../modules/notification/domain/services/notification.service';
import type {
  NotificationService,
  SendNotificationRequest,
} from '../modules/notification/domain/services/notification.service';

describe('StartupService', () => {
  let runMigrations: jest.Mock<Promise<void>, []>;
  let send: jest.Mock<Promise<void>, [SendNotificationRequest]>;
  let service: StartupService;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    runMigrations = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
    send = jest
      .fn<Promise<void>, [SendNotificationRequest]>()
      .mockResolvedValue(undefined);
    service = new StartupService(
      { runMigrations } as unknown as MigrationService,
      { send } as unknown as NotificationService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends one default-priority notification when migrations succeed', async () => {
    await service.onModuleInit();

    expect(send).toHaveBeenCalledTimes(1);
    const { title, priority } = send.mock.calls[0][0];
    expect(title?.value).toBe('Blue Star Backend Started');
    expect(priority).toBe(NotificationPriority.DEFAULT);
  });

  it('sends one high-priority failure notification when migrations fail', async () => {
    runMigrations.mockRejectedValue(new Error('relation x already exists'));

    await expect(service.onModuleInit()).resolves.toBeUndefined();

    expect(send).toHaveBeenCalledTimes(1);
    const { title, message, priority, tags, topic } = send.mock.calls[0][0];
    expect(title?.value).toBe('Blue Star Backend Started — migrations FAILED');
    expect(message.value).toContain('relation x already exists');
    expect(priority).toBe(NotificationPriority.HIGH);
    expect(tags).toEqual(['warning', 'backend', 'startup']);
    expect(topic.value).toBe('blue-star-backend');
  });

  it('truncates a long migration error to 4000 characters', async () => {
    runMigrations.mockRejectedValue(new Error('x'.repeat(10_000)));

    await service.onModuleInit();

    expect(send.mock.calls[0][0].message.value).toHaveLength(4000);
  });

  it.each([new Error(''), new Error('   '), 'boom', undefined])(
    'still sends a non-empty failure message for the unusable error %p',
    async (rejection) => {
      runMigrations.mockRejectedValue(rejection);

      await service.onModuleInit();

      expect(send).toHaveBeenCalledTimes(1);
      expect(send.mock.calls[0][0].message.value).toBe('Unknown error');
    },
  );

  it('resolves when the notification send rejects', async () => {
    send.mockRejectedValue(new Error('ntfy down'));

    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });
});
