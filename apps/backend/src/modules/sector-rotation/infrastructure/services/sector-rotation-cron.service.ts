import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SectorRotationPersistenceService } from '../../domain/services/sector-rotation-persistence.service';
import { SECTOR_ROTATION_PERSISTENCE_SERVICE } from '../../constants/tokens';
import { RotationUniverseRegistry } from '../universes/rotation-universe.registry';
import { CronJobNotificationService } from '../../../notification/infrastructure/services/cron-job-notification.service';

@Injectable()
export class SectorRotationCronService {
  private readonly logger = new Logger(SectorRotationCronService.name);

  constructor(
    @Inject(SECTOR_ROTATION_PERSISTENCE_SERVICE)
    private readonly persistenceService: SectorRotationPersistenceService,
    private readonly universeRegistry: RotationUniverseRegistry,
    private readonly cronJobNotificationService: CronJobNotificationService,
  ) {}

  @Cron('30 16 * * 5', { timeZone: 'America/Toronto' })
  async runWeeklyCalculation() {
    const jobName = 'Weekly Sector Rotation';
    const universes = this.universeRegistry.listUniverses();
    this.logger.log(
      `Starting weekly sector rotation calculation for ${universes.length} universe(s)...`,
    );

    await this.cronJobNotificationService.notifyJobStart({
      jobName,
      jobType: 'sector-rotation',
      frequency: 'weekly',
    });

    let succeeded = 0;
    const failures: string[] = [];

    try {
      for (const universe of universes) {
        try {
          await this.persistenceService.computeAndSaveIncremental(universe);
          succeeded += 1;
          this.logger.log(
            `Weekly sector rotation calculation completed for universe ${universe.id}`,
          );
        } catch (error) {
          failures.push(universe.id);
          const errorMessage = `Weekly sector rotation calculation failed for universe ${universe.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          this.logger.error(errorMessage);
          if (error instanceof Error) {
            this.logger.error(error.stack);
          }
        }
      }

      if (failures.length > 0) {
        const errorMessage = `${failures.length}/${universes.length} universe(s) failed: ${failures.join(', ')}`;
        await this.cronJobNotificationService.notifyJobError(
          { jobName, jobType: 'sector-rotation', frequency: 'weekly' },
          new Error(errorMessage),
        );
        return;
      }

      await this.cronJobNotificationService.notifyJobSuccess({
        jobName,
        jobType: 'sector-rotation',
        frequency: 'weekly',
        additionalData: `${succeeded}/${universes.length} universe(s) processed`,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`${jobName} failed: ${msg}`);
      await this.cronJobNotificationService.notifyJobError(
        { jobName, jobType: 'sector-rotation', frequency: 'weekly' },
        error,
      );
    }
  }
}
