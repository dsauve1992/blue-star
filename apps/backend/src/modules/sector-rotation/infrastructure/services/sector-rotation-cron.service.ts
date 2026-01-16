import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Sector } from '../../domain/value-objects/sector';
import { SectorRotationPersistenceService } from '../../domain/services/sector-rotation-persistence.service';
import { SECTOR_ROTATION_PERSISTENCE_SERVICE } from '../../constants/tokens';

const DEFAULT_SECTORS: Array<{ symbol: string; name: string }> = [
  { symbol: 'XLK', name: 'Technology' },
  { symbol: 'XLE', name: 'Energy' },
  { symbol: 'XLI', name: 'Industrial' },
  { symbol: 'XLY', name: 'Consumer Discretionary' },
  { symbol: 'XLP', name: 'Consumer Staples' },
  { symbol: 'XLV', name: 'Healthcare' },
  { symbol: 'XLF', name: 'Financial' },
  { symbol: 'XLB', name: 'Materials' },
  { symbol: 'XLU', name: 'Utilities' },
  { symbol: 'XLRE', name: 'Real Estate' },
  { symbol: 'XLC', name: 'Communication Services' },
];

@Injectable()
export class SectorRotationCronService {
  private readonly logger = new Logger(SectorRotationCronService.name);

  constructor(
    @Inject(SECTOR_ROTATION_PERSISTENCE_SERVICE)
    private readonly persistenceService: SectorRotationPersistenceService,
  ) {}

  @Cron('0 2 * * 6')
  async runWeeklyCalculation() {
    this.logger.log('Starting weekly sector rotation calculation...');
    try {
      const sectors = DEFAULT_SECTORS.map((s) => Sector.of(s.symbol, s.name));
      await this.persistenceService.computeAndSaveIncremental(sectors);
      this.logger.log(
        'Weekly sector rotation calculation completed successfully',
      );
    } catch (error) {
      this.logger.error(
        `Weekly sector rotation calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
