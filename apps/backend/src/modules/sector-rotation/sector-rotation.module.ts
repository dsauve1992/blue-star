import { Module } from '@nestjs/common';
import { SectorRotationController } from './api/sector-rotation.controller';
import { SectorRotationApiMapper } from './api/sector-rotation-api.mapper';
import { CalculateSectorRotationUseCase } from './use-cases/calculate-sector-rotation.use-case';
import { SectorRotationCalculationServiceImpl } from './infrastructure/services/sector-rotation-calculation.service';
import { SECTOR_ROTATION_CALCULATION_SERVICE } from './constants/tokens';
import { MarketDataModule } from '../market-data/market-data.module';

export { SECTOR_ROTATION_CALCULATION_SERVICE };

@Module({
  imports: [MarketDataModule],
  controllers: [SectorRotationController],
  providers: [
    {
      provide: SECTOR_ROTATION_CALCULATION_SERVICE,
      useClass: SectorRotationCalculationServiceImpl,
    },
    SectorRotationApiMapper,
    CalculateSectorRotationUseCase,
  ],
})
export class SectorRotationModule {}
