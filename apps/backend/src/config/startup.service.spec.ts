import { StartupService } from './startup.service';
import { NotificationPriority } from '../modules/notification/domain/services/notification.service';

describe('StartupService', () => {
  function build(migrate: () => Promise<void>) {
    const migrationService = { runMigrations: jest.fn(migrate) };
    const notificationService = { send: jest.fn().mockResolvedValue(undefined) };
    const service = new StartupService(migrationService as never, notificationService as never);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    return { service, notificationService };
  }

  afterEach(() => jest.restoreAllMocks());

  it('sends the normal startup notification when migrations succeed', async () => {
    const { service, notificationService } = build(async () => undefined);

    await service.onModuleInit();

    expect(notificationService.send).toHaveBeenCalledTimes(1);
    const sent = notificationService.send.mock.calls[0][0];
    expect(sent.message.value).toContain('up and running');
    expect(sent.priority).toBe(NotificationPriority.DEFAULT);
  });

  it('does not send the green "up and running" message when a migration fails', async () => {
    const { service, notificationService } = build(async () => {
      throw new Error('lock timeout');
    });

    await service.onModuleInit();

    expect(notificationService.send).toHaveBeenCalledTimes(1);
    const sent = notificationService.send.mock.calls[0][0];
    expect(sent.message.value).not.toContain('up and running');
    expect(sent.title.value).toContain('migration failed');
    expect(sent.priority).toBe(NotificationPriority.HIGH);
  });

  it('still starts when the notification itself fails', async () => {
    const { service, notificationService } = build(async () => undefined);
    notificationService.send.mockRejectedValue(new Error('push down'));

    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });
});
