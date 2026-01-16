import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '../../config/database.module';
import { SectorRotationController } from './api/sector-rotation.controller';
import { SectorRotationApiMapper } from './api/sector-rotation-api.mapper';
import { CalculateSectorRotationUseCase } from './use-cases/calculate-sector-rotation.use-case';
import { SectorRotationCalculationServiceImpl } from './infrastructure/services/sector-rotation-calculation.service';
import { SectorRotationPersistenceServiceImpl } from './infrastructure/services/sector-rotation-persistence.service';
import { SectorRotationCronService } from './infrastructure/services/sector-rotation-cron.service';
import { ZScoreNormalizer } from './infrastructure/services/z-score-normalizer.service';
import { BenchmarkCalculator } from './infrastructure/services/benchmark-calculator.service';
import { SectorRotationDataReadRepositoryImpl } from './infrastructure/repositories/sector-rotation-data-read.repository';
import { SectorRotationDataWriteRepositoryImpl } from './infrastructure/repositories/sector-rotation-data-write.repository';
import {
  SECTOR_ROTATION_CALCULATION_SERVICE,
  SECTOR_ROTATION_DATA_READ_REPOSITORY,
  SECTOR_ROTATION_DATA_WRITE_REPOSITORY,
  SECTOR_ROTATION_PERSISTENCE_SERVICE,
} from './constants/tokens';
import { MarketDataModule } from '../market-data/market-data.module';

export {
  SECTOR_ROTATION_CALCULATION_SERVICE,
  SECTOR_ROTATION_DATA_READ_REPOSITORY,
  SECTOR_ROTATION_DATA_WRITE_REPOSITORY,
  SECTOR_ROTATION_PERSISTENCE_SERVICE,
};

@Module({
  imports: [ScheduleModule.forRoot(), DatabaseModule, MarketDataModule],
  controllers: [SectorRotationController],
  providers: [
    {
      provide: SECTOR_ROTATION_CALCULATION_SERVICE,
      useClass: SectorRotationCalculationServiceImpl,
    },
    {
      provide: SECTOR_ROTATION_DATA_READ_REPOSITORY,
      useClass: SectorRotationDataReadRepositoryImpl,
    },
    {
      provide: SECTOR_ROTATION_DATA_WRITE_REPOSITORY,
      useClass: SectorRotationDataWriteRepositoryImpl,
    },
    {
      provide: SECTOR_ROTATION_PERSISTENCE_SERVICE,
      useClass: SectorRotationPersistenceServiceImpl,
    },
    ZScoreNormalizer,
    BenchmarkCalculator,
    SectorRotationApiMapper,
    CalculateSectorRotationUseCase,
    SectorRotationCronService,
  ],
})
export class SectorRotationModule {}
