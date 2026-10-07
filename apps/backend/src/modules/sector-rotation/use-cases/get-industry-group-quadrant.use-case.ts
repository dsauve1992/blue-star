import { Inject, Injectable } from '@nestjs/common';
import { SECTOR_ROTATION_DATA_READ_REPOSITORY } from '../constants/tokens';
import type { SectorRotationDataReadRepository } from '../domain/repositories/sector-rotation-data-read.repository.interface';
import { RotationUniverseRegistry } from '../infrastructure/universes/rotation-universe.registry';
import { GICS_INDUSTRY_GROUP_UNIVERSE_ID } from '../infrastructure/universes/gics-industry-group.universe';

@Injectable()
export class GetIndustryGroupQuadrantUseCase {
  constructor(
    @Inject(SECTOR_ROTATION_DATA_READ_REPOSITORY)
    private readonly sectorRotationRepository: SectorRotationDataReadRepository,
    private readonly universeRegistry: RotationUniverseRegistry,
  ) {}

  async execute(industryGroupName: string): Promise<string | null> {
    const universe = this.universeRegistry.get(GICS_INDUSTRY_GROUP_UNIVERSE_ID);
    const member = universe.findByName(industryGroupName);
    if (!member) return null;

    const dataPoint = await this.sectorRotationRepository.findLatestBySector(
      GICS_INDUSTRY_GROUP_UNIVERSE_ID,
      member.symbol,
    );
    return dataPoint?.quadrant.value ?? null;
  }
}
