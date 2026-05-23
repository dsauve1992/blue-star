import { Injectable, Inject } from '@nestjs/common';
import { DateRange } from '../../market-data/domain/value-objects/date-range';
import { SectorRotationResult } from '../domain/value-objects/sector-rotation-result';
import { SectorRotationPersistenceService } from '../domain/services/sector-rotation-persistence.service';
import { SECTOR_ROTATION_PERSISTENCE_SERVICE } from '../constants/tokens';
import { RotationUniverseRegistry } from '../infrastructure/universes/rotation-universe.registry';
import { restrictUniverseToRequestedSymbols } from './calculate-sector-rotation.use-case';

export interface GetSectorRotationRequestDto {
  sectors: Array<{ symbol: string; name: string }>;
  startDate: Date;
  endDate: Date;
  universeId?: string;
}

export interface GetSectorRotationResponseDto {
  result: SectorRotationResult;
}

@Injectable()
export class GetSectorRotationUseCase {
  constructor(
    @Inject(SECTOR_ROTATION_PERSISTENCE_SERVICE)
    private readonly persistenceService: SectorRotationPersistenceService,
    private readonly universeRegistry: RotationUniverseRegistry,
  ) {}

  async execute(
    request: GetSectorRotationRequestDto,
  ): Promise<GetSectorRotationResponseDto> {
    const universeId =
      request.universeId ?? RotationUniverseRegistry.defaultUniverseId();
    const universe = restrictUniverseToRequestedSymbols(
      this.universeRegistry.get(universeId),
      request.sectors,
    );

    const dateRange = DateRange.of(request.startDate, request.endDate);

    const result = await this.persistenceService.getOrCompute(
      universe,
      dateRange,
    );

    return { result };
  }
}
