/* eslint-disable @typescript-eslint/no-unsafe-assignment  */
/* eslint-disable @typescript-eslint/no-unsafe-member-access  */
import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../auth/auth.module';
import { DateRange } from '../../../shared/value-objects/date-range';
import { CalculateSectorRotationUseCase } from '../use-cases/calculate-sector-rotation.use-case';
import { GetSectorRotationUseCase } from '../use-cases/get-sector-rotation.use-case';
import { CompareSectorRotationUseCase } from '../use-cases/compare-sector-rotation.use-case';
import { SectorRotationApiMapper } from './sector-rotation-api.mapper';
import {
  CalculateSectorRotationApiResponseDto,
  CompareSectorRotationApiResponseDto,
  LatestSectorStatusApiResponseDto,
} from './sector-rotation-api.dto';
import { RRG_PARAMETERS } from '../constants/rrg-parameters';
import { RotationUniverseRegistry } from '../infrastructure/universes/rotation-universe.registry';
import { RotationUniverse } from '../domain/value-objects/rotation-universe';

function parseDate(raw: string, name: string): Date {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${name} must be a valid date`);
  }
  return date;
}

function parseDateRange(
  startDate: string | undefined,
  endDate: string | undefined,
): { startDate: Date; endDate: Date } {
  const end = endDate ? parseDate(endDate, 'endDate') : new Date();
  const start = startDate
    ? parseDate(startDate, 'startDate')
    : new Date(end.getTime() - 52 * 7 * 24 * 60 * 60 * 1000);
  try {
    DateRange.of(start, end);
  } catch (error) {
    throw new BadRequestException(
      error instanceof Error ? error.message : 'Invalid date range',
    );
  }
  return { startDate: start, endDate: end };
}

@Controller('sector-rotation')
export class SectorRotationController {
  constructor(
    private readonly calculateSectorRotationUseCase: CalculateSectorRotationUseCase,
    private readonly getSectorRotationUseCase: GetSectorRotationUseCase,
    private readonly compareSectorRotationUseCase: CompareSectorRotationUseCase,
    private readonly sectorRotationApiMapper: SectorRotationApiMapper,
    private readonly universeRegistry: RotationUniverseRegistry,
  ) {}

  @Get('calculate')
  async calculateSectorRotation(
    @Query('sectors') sectorsParam?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('mode') mode?: string,
    @Query('universe') universeId?: string,
  ): Promise<CalculateSectorRotationApiResponseDto> {
    const universe = this.resolveUniverse(universeId);
    const resolvedUniverseId = universe.id;
    const { startDate: requestedStartDate, endDate: endDateObj } =
      parseDateRange(startDate, endDate);
    const sectors = sectorsParam
      ? this.parseSectors(sectorsParam)
      : this.defaultSectorsForUniverse(universe);

    const usePersisted = mode === 'persisted' || mode === 'cache';

    if (usePersisted) {
      const request = {
        sectors,
        startDate: requestedStartDate,
        endDate: endDateObj,
        universeId: resolvedUniverseId,
      };

      const useCaseResponse =
        await this.getSectorRotationUseCase.execute(request);
      return this.sectorRotationApiMapper.mapCalculateSectorRotationResponse(
        useCaseResponse,
      );
    }

    const requiredLookbackWeeks = RRG_PARAMETERS.NORMALIZATION_WINDOW_WEEKS;

    const startDateObj = new Date(
      requestedStartDate.getTime() -
        requiredLookbackWeeks * 7 * 24 * 60 * 60 * 1000,
    );

    const request = {
      sectors,
      startDate: startDateObj,
      endDate: endDateObj,
      universeId: resolvedUniverseId,
    };

    const useCaseResponse =
      await this.calculateSectorRotationUseCase.execute(request);
    return this.sectorRotationApiMapper.mapCalculateSectorRotationResponse(
      useCaseResponse,
    );
  }

  @Get('compare')
  async compareSectorRotation(
    @Query('sectors') sectorsParam?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('universe') universeId?: string,
  ): Promise<CompareSectorRotationApiResponseDto> {
    const universe = this.resolveUniverse(universeId);
    const resolvedUniverseId = universe.id;
    const { startDate: requestedStartDate, endDate: endDateObj } =
      parseDateRange(startDate, endDate);
    const sectors = sectorsParam
      ? this.parseSectors(sectorsParam)
      : this.defaultSectorsForUniverse(universe);

    const request = {
      sectors,
      startDate: requestedStartDate,
      endDate: endDateObj,
      universeId: resolvedUniverseId,
    };

    const useCaseResponse =
      await this.compareSectorRotationUseCase.execute(request);

    return {
      persisted: this.sectorRotationApiMapper.mapSectorRotationResult(
        useCaseResponse.persisted,
      ),
      live: this.sectorRotationApiMapper.mapSectorRotationResult(
        useCaseResponse.live,
      ),
      differences: useCaseResponse.differences,
      summary: useCaseResponse.summary,
    };
  }

  @Get('universes')
  @Public()
  listUniverses(): {
    defaultId: string;
    universes: Array<{
      id: string;
      label: string;
      benchmarkSymbol: string;
      members: Array<{ symbol: string; name: string }>;
    }>;
  } {
    return {
      defaultId: RotationUniverseRegistry.defaultUniverseId(),
      universes: this.universeRegistry.listUniverses().map((u) => ({
        id: u.id,
        label: u.label,
        benchmarkSymbol: u.benchmarkSymbol,
        members: u.members.map((m) => ({ symbol: m.symbol, name: m.name })),
      })),
    };
  }

  @Get('latest-status')
  @Public()
  async getLatestSectorStatus(
    @Query('universe') universeId?: string,
  ): Promise<LatestSectorStatusApiResponseDto> {
    const universe = this.resolveUniverse(universeId);
    const resolvedUniverseId = universe.id;
    const sectors = this.defaultSectorsForUniverse(universe);
    const endDate = new Date();
    const startDate = new Date(
      endDate.getTime() - 52 * 7 * 24 * 60 * 60 * 1000,
    );

    const request = {
      sectors,
      startDate,
      endDate,
      universeId: resolvedUniverseId,
    };

    const useCaseResponse =
      await this.getSectorRotationUseCase.execute(request);

    const latestDataPoints = useCaseResponse.result.getLatestDataPoints();

    if (latestDataPoints.length === 0) {
      return {
        sectors: [],
        date: endDate.toISOString(),
      };
    }

    const latestDate = latestDataPoints[0].date;

    const sectorStatuses = latestDataPoints.map((point) => {
      const member = universe.findBySymbol(point.sectorSymbol);
      return {
        name: member?.name ?? point.sectorSymbol,
        quadrant: point.quadrant.value,
        x: point.x,
        y: point.y,
      };
    });

    return {
      sectors: sectorStatuses,
      date: latestDate.toISOString(),
    };
  }

  private resolveUniverse(universeId?: string): RotationUniverse {
    const id = universeId ?? RotationUniverseRegistry.defaultUniverseId();
    if (!this.universeRegistry.has(id)) {
      throw new BadRequestException(
        `Unknown rotation universe: ${id}. Registered: ${this.universeRegistry.listIds().join(', ')}`,
      );
    }
    return this.universeRegistry.get(id);
  }

  private defaultSectorsForUniverse(
    universe: RotationUniverse,
  ): Array<{ symbol: string; name: string }> {
    return universe.members.map((m) => ({ symbol: m.symbol, name: m.name }));
  }

  private parseSectors(
    sectorsParam: string,
  ): Array<{ symbol: string; name: string }> {
    try {
      const parsed = JSON.parse(sectorsParam);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => ({
          symbol: s.symbol || s,
          name: s.name || s.symbol || s,
        }));
      }
      throw new Error('Sectors must be an array');
    } catch {
      const symbols = sectorsParam.split(',').map((s) => s.trim());
      return symbols.map((symbol) => ({ symbol, name: symbol }));
    }
  }
}
