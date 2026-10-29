import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { NoopNotificationService } from './infrastructure/services/noop-notification.service';
import { NtfyNotificationService } from './infrastructure/services/ntfy-notification.service';
import {
  NOTIFICATION_SERVICE,
  NotificationModule,
  type NotificationService,
} from './notification.module';

describe('NotificationModule', () => {
  const resolveNotificationService = async (config: Record<string, string>) => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          ignoreEnvVars: true,
          load: [() => config],
        }),
        NotificationModule,
      ],
    }).compile();
    return moduleRef.get<NotificationService>(NOTIFICATION_SERVICE);
  };

  it('sends through ntfy by default', async () => {
    expect(await resolveNotificationService({})).toBeInstanceOf(
      NtfyNotificationService,
    );
  });

  it('sends nothing when NOTIFICATIONS_ENABLED is false', async () => {
    expect(
      await resolveNotificationService({ NOTIFICATIONS_ENABLED: 'false' }),
    ).toBeInstanceOf(NoopNotificationService);
  });
});
