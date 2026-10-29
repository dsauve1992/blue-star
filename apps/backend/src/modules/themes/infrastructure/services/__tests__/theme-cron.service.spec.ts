import { ThemeCronService } from '../theme-cron.service';
import { ThemeService } from '../../../domain/services/theme.service';
import { CronJobNotificationService } from '../../../../notification/notification.module';

describe('ThemeCronService', () => {
  let themeService: jest.Mocked<ThemeService>;
  let notifications: jest.Mocked<
    Pick<
      CronJobNotificationService,
      'notifyJobStart' | 'notifyJobSuccess' | 'notifyJobError'
    >
  >;
  let service: ThemeCronService;

  beforeEach(() => {
    themeService = { extractAndSaveThemes: jest.fn() };
    notifications = {
      notifyJobStart: jest.fn().mockResolvedValue(undefined),
      notifyJobSuccess: jest.fn().mockResolvedValue(undefined),
      notifyJobError: jest.fn().mockResolvedValue(undefined),
    };
    service = new ThemeCronService(
      themeService,
      notifications as unknown as CronJobNotificationService,
    );
  });

  it('reports the refreshed count and skipped themes on success', async () => {
    themeService.extractAndSaveThemes.mockResolvedValue({
      refreshed: 9,
      skipped: ['AI', 'Quantum'],
    });

    await service.runWeeklyThemeExtraction();

    expect(notifications.notifyJobSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        additionalData: '9 themes refreshed, 2 skipped: AI, Quantum',
      }),
    );
    expect(notifications.notifyJobError).not.toHaveBeenCalled();
  });

  it('omits the skipped list when nothing was skipped', async () => {
    themeService.extractAndSaveThemes.mockResolvedValue({
      refreshed: 3,
      skipped: [],
    });

    await service.runWeeklyThemeExtraction();

    expect(notifications.notifyJobSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        additionalData: '3 themes refreshed, 0 skipped',
      }),
    );
  });

  it('notifies an error and not success when extraction rejects', async () => {
    const error = new Error(
      'No themes refreshed: all 2 came back with no tickers',
    );
    themeService.extractAndSaveThemes.mockRejectedValue(error);

    await service.runWeeklyThemeExtraction();

    expect(notifications.notifyJobError).toHaveBeenCalledWith(
      expect.any(Object),
      error,
    );
    expect(notifications.notifyJobSuccess).not.toHaveBeenCalled();
  });
});
