import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Sector } from '../../domain/value-objects/sector';
import { SectorRotationPersistenceService } from '../../domain/services/sector-rotation-persistence.service';
import { SECTOR_ROTATION_PERSISTENCE_SERVICE } from '../../constants/tokens';

@Injectable()
export class SectorRotationCronService {
  private readonly logger = new Logger(SectorRotationCronService.name);

  constructor(
    @Inject(SECTOR_ROTATION_PERSISTENCE_SERVICE)
    private readonly persistenceService: SectorRotationPersistenceService,
  ) {}

  @Cron('0 19 * * 5-6-7')
  async runWeeklyCalculation() {
    this.logger.log('Starting weekly sector rotation calculation...');
    console.log(
      '[SectorRotationCron] Starting weekly sector rotation calculation...',
    );
    try {
      const sectors = Sector.ALL_SECTORS;
      await this.persistenceService.computeAndSaveIncremental(sectors);
      const successMessage =
        'Weekly sector rotation calculation completed successfully';
      this.logger.log(successMessage);
      console.log(`[SectorRotationCron] ${successMessage}`);
    } catch (error) {
      const errorMessage = `Weekly sector rotation calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.logger.error(errorMessage);
      console.error(`[SectorRotationCron] ${errorMessage}`);
      if (error instanceof Error) {
        console.error('[SectorRotationCron] Error stack:', error.stack);
      }
    }
  }
}
