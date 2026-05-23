import { Injectable, Inject } from '@nestjs/common';
import { DateRange } from '../../market-data/domain/value-objects/date-range';
import {
  SectorRotationCalculationService,
  SectorRotationCalculationParams,
} from '../domain/services/sector-rotation-calculation.service';
import { SectorRotationResult } from '../domain/value-objects/sector-rotation-result';
import { RotationMember } from '../domain/value-objects/rotation-member';
import { RotationUniverse } from '../domain/value-objects/rotation-universe';
import { SECTOR_ROTATION_CALCULATION_SERVICE } from '../constants/tokens';
import { RRG_PARAMETERS } from '../constants/rrg-parameters';
import { RotationUniverseRegistry } from '../infrastructure/universes/rotation-universe.registry';

export interface CalculateSectorRotationRequestDto {
  sectors: Array<{ symbol: string; name: string }>;
  startDate: Date;
  endDate: Date;
  universeId?: string;
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
    private readonly universeRegistry: RotationUniverseRegistry,
  ) {}

  async execute(
    request: CalculateSectorRotationRequestDto,
  ): Promise<CalculateSectorRotationResponseDto> {
    const universeId =
      request.universeId ?? RotationUniverseRegistry.defaultUniverseId();
    const registeredUniverse = this.universeRegistry.get(universeId);

    const universe = restrictUniverseToRequestedSymbols(
      registeredUniverse,
      request.sectors,
    );

    const dateRange = DateRange.of(request.startDate, request.endDate);

    const params: SectorRotationCalculationParams = {
      momentumWeeks: RRG_PARAMETERS.MOMENTUM_WEEKS,
      normalizationWindowWeeks: RRG_PARAMETERS.NORMALIZATION_WINDOW_WEEKS,
    };

    const result = await this.calculationService.calculate(
      universe,
      dateRange,
      params,
    );

    return { result };
  }
}

/**
 * Returns a universe containing only the members whose symbols are in
 * `requestedSectors`. If no symbols are recognized, falls back to the full
 * universe (matches the previous behavior where `Sector.fromEtfSymbol` returned
 * null for unknown symbols and the filter dropped them — empty universes
 * cause downstream errors today).
 */
export function restrictUniverseToRequestedSymbols(
  universe: RotationUniverse,
  requestedSectors: Array<{ symbol: string }>,
): RotationUniverse {
  if (!requestedSectors || requestedSectors.length === 0) {
    return universe;
  }

  const members: RotationMember[] = [];
  for (const requested of requestedSectors) {
    const found = universe.findBySymbol(requested.symbol);
    if (found) {
      members.push(found);
    }
  }

  if (members.length === 0) {
    return universe;
  }

  return RotationUniverse.of({
    id: universe.id,
    label: universe.label,
    members,
    benchmarkSymbol: universe.benchmarkSymbol,
  });
}
