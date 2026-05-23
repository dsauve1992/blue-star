import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SectorRotationPersistenceService } from '../../domain/services/sector-rotation-persistence.service';
import { SECTOR_ROTATION_PERSISTENCE_SERVICE } from '../../constants/tokens';
import { RotationUniverseRegistry } from '../universes/rotation-universe.registry';

@Injectable()
export class SectorRotationCronService {
  private readonly logger = new Logger(SectorRotationCronService.name);

  constructor(
    @Inject(SECTOR_ROTATION_PERSISTENCE_SERVICE)
    private readonly persistenceService: SectorRotationPersistenceService,
    private readonly universeRegistry: RotationUniverseRegistry,
  ) {}

  @Cron('30 16 * * 5', { timeZone: 'America/Toronto' })
  async runWeeklyCalculation() {
    const universes = this.universeRegistry.listUniverses();
    this.logger.log(
      `Starting weekly sector rotation calculation for ${universes.length} universe(s)...`,
    );

    for (const universe of universes) {
      try {
        await this.persistenceService.computeAndSaveIncremental(universe);
        this.logger.log(
          `Weekly sector rotation calculation completed for universe ${universe.id}`,
        );
      } catch (error) {
        const errorMessage = `Weekly sector rotation calculation failed for universe ${universe.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        this.logger.error(errorMessage);
        if (error instanceof Error) {
          this.logger.error(error.stack);
        }
      }
    }
  }
}
