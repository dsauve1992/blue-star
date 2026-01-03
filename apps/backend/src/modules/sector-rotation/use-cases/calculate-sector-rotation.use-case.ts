import { Injectable, Inject } from '@nestjs/common';
import { DateRange } from '../../market-data/domain/value-objects/date-range';
import {
  SectorRotationCalculationService,
  SectorRotationCalculationParams,
} from '../domain/services/sector-rotation-calculation.service';
import { SectorRotationResult } from '../domain/value-objects/sector-rotation-result';
import { Sector } from '../domain/value-objects/sector';
import { SECTOR_ROTATION_CALCULATION_SERVICE } from '../constants/tokens';

export interface CalculateSectorRotationRequestDto {
  sectors: Array<{ symbol: string; name: string }>;
  startDate: Date;
  endDate: Date;
  lookbackWeeks?: number;
  momentumWeeks?: number;
  normalizationWindowWeeks?: number;
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
      lookbackWeeks: request.lookbackWeeks ?? 12,
      momentumWeeks: request.momentumWeeks ?? 5,
      normalizationWindowWeeks: request.normalizationWindowWeeks ?? 5,
    };

    const result = await this.calculationService.calculate(
      sectors,
      dateRange,
      params,
    );

    return { result };
  }
}
