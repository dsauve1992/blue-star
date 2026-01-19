import { Injectable, Inject } from '@nestjs/common';
import { DateRange } from '../../market-data/domain/value-objects/date-range';
import { SectorRotationResult } from '../domain/value-objects/sector-rotation-result';
import { Sector } from '../domain/value-objects/sector';
import { SectorRotationPersistenceService } from '../domain/services/sector-rotation-persistence.service';
import { SECTOR_ROTATION_PERSISTENCE_SERVICE } from '../constants/tokens';

export interface GetSectorRotationRequestDto {
  sectors: Array<{ symbol: string; name: string }>;
  startDate: Date;
  endDate: Date;
}

export interface GetSectorRotationResponseDto {
  result: SectorRotationResult;
}

@Injectable()
export class GetSectorRotationUseCase {
  constructor(
    @Inject(SECTOR_ROTATION_PERSISTENCE_SERVICE)
    private readonly persistenceService: SectorRotationPersistenceService,
  ) {}

  async execute(
    request: GetSectorRotationRequestDto,
  ): Promise<GetSectorRotationResponseDto> {
    const sectors = request.sectors
      .map((s) => Sector.fromEtfSymbol(s.symbol))
      .filter((s): s is Sector => s !== null);
    const dateRange = DateRange.of(request.startDate, request.endDate);

    const result = await this.persistenceService.getOrCompute(
      sectors,
      dateRange,
    );

    return { result };
  }
}
