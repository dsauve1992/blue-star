import { Injectable, Inject } from '@nestjs/common';
import { DateRange } from '../../market-data/domain/value-objects/date-range';
import {
  SectorRotationCalculationService,
  SectorRotationCalculationParams,
} from '../domain/services/sector-rotation-calculation.service';
import { SectorRotationResult } from '../domain/value-objects/sector-rotation-result';
import { Sector } from '../domain/value-objects/sector';
import { SECTOR_ROTATION_CALCULATION_SERVICE } from '../constants/tokens';
import { RRG_PARAMETERS } from '../constants/rrg-parameters';

export interface CalculateSectorRotationRequestDto {
  sectors: Array<{ symbol: string; name: string }>;
  startDate: Date;
  endDate: Date;
  benchmarkType?: string;
}

export interface CalculateSectorRotationResponseDto {
  result: SectorRotationResult;
}

@Injectable()
export class CalculateSectorRotationUseCase {
  constructor(
    @Inject(SECTOR_ROTATION_CALCULATION_SERVICE)
    private readonly calculationService: SectorRotationCalculationService,
  ) {}

  async execute(
    request: CalculateSectorRotationRequestDto,
  ): Promise<CalculateSectorRotationResponseDto> {
    const sectors = request.sectors.map((s) => Sector.of(s.symbol, s.name));
    const dateRange = DateRange.of(request.startDate, request.endDate);

    const params: SectorRotationCalculationParams = {
      momentumWeeks: RRG_PARAMETERS.MOMENTUM_WEEKS,
      normalizationWindowWeeks: RRG_PARAMETERS.NORMALIZATION_WINDOW_WEEKS,
    };

    const result = await this.calculationService.calculate(
      sectors,
      dateRange,
      params,
    );

    return { result };
  }
}
