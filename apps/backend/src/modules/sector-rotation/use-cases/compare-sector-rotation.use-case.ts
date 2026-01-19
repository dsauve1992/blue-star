import { Injectable, Inject } from '@nestjs/common';
import { DateRange } from '../../market-data/domain/value-objects/date-range';
import { SectorRotationResult } from '../domain/value-objects/sector-rotation-result';
import { Sector } from '../domain/value-objects/sector';
import {
  SectorRotationCalculationService,
  SectorRotationCalculationParams,
} from '../domain/services/sector-rotation-calculation.service';
import { SectorRotationPersistenceService } from '../domain/services/sector-rotation-persistence.service';
import { SECTOR_ROTATION_CALCULATION_SERVICE } from '../constants/tokens';
import { SECTOR_ROTATION_PERSISTENCE_SERVICE } from '../constants/tokens';
import { RRG_PARAMETERS } from '../constants/rrg-parameters';
import { SectorRotationDataPoint } from '../domain/value-objects/sector-rotation-data-point';

export interface CompareSectorRotationRequestDto {
  sectors: Array<{ symbol: string; name: string }>;
  startDate: Date;
  endDate: Date;
}

export interface ComparisonDifference {
  date: string;
  sectorSymbol: string;
  persisted: {
    x: number;
    y: number;
    relativeStrength: number;
  } | null;
  live: {
    x: number;
    y: number;
    relativeStrength: number;
  } | null;
  differences: {
    x: number;
    y: number;
    relativeStrength: number;
  };
}

export interface CompareSectorRotationResponseDto {
  persisted: SectorRotationResult;
  live: SectorRotationResult;
  differences: ComparisonDifference[];
  summary: {
    totalDataPoints: number;
    matchingDataPoints: number;
    differentDataPoints: number;
    maxDifference: {
      x: number;
      y: number;
      relativeStrength: number;
    };
  };
}

@Injectable()
export class CompareSectorRotationUseCase {
  constructor(
    @Inject(SECTOR_ROTATION_CALCULATION_SERVICE)
    private readonly calculationService: SectorRotationCalculationService,
    @Inject(SECTOR_ROTATION_PERSISTENCE_SERVICE)
    private readonly persistenceService: SectorRotationPersistenceService,
  ) {}

  async execute(
    request: CompareSectorRotationRequestDto,
  ): Promise<CompareSectorRotationResponseDto> {
    const sectors = request.sectors
      .map((s) => Sector.fromEtfSymbol(s.symbol))
      .filter((s): s is Sector => s !== null);
    const dateRange = DateRange.of(request.startDate, request.endDate);

    const requiredLookbackWeeks = Math.max(
      RRG_PARAMETERS.NORMALIZATION_WINDOW_WEEKS,
      RRG_PARAMETERS.MOMENTUM_WEEKS,
      RRG_PARAMETERS.RS_SMOOTHING_PERIOD,
    );

    const computeStartDate = new Date(request.startDate);
    computeStartDate.setDate(
      computeStartDate.getDate() - requiredLookbackWeeks * 7,
    );

    const computeDateRange = DateRange.of(computeStartDate, request.endDate);
    const params: SectorRotationCalculationParams = {
      momentumWeeks: RRG_PARAMETERS.MOMENTUM_WEEKS,
      normalizationWindowWeeks: RRG_PARAMETERS.NORMALIZATION_WINDOW_WEEKS,
    };

    const [persistedResult, liveResult] = await Promise.all([
      this.persistenceService.getOrCompute(sectors, dateRange),
      this.calculationService.calculate(sectors, computeDateRange, params),
    ]);

    const filteredLiveResult = SectorRotationResult.of(
      dateRange.startDate,
      dateRange.endDate,
      liveResult.dataPoints.filter(
        (point) =>
          point.date >= dateRange.startDate && point.date <= dateRange.endDate,
      ),
      liveResult.sectorSymbols,
    );

    const differences = this.calculateDifferences(
      persistedResult,
      filteredLiveResult,
    );

    const summary = this.calculateSummary(differences);

    return {
      persisted: persistedResult,
      live: filteredLiveResult,
      differences,
      summary,
    };
  }

  private calculateDifferences(
    persisted: SectorRotationResult,
    live: SectorRotationResult,
  ): ComparisonDifference[] {
    const persistedMap = new Map<
      string,
      Map<string, SectorRotationDataPoint>
    >();
    const liveMap = new Map<string, Map<string, SectorRotationDataPoint>>();

    for (const point of persisted.dataPoints) {
      const dateKey = point.date.toISOString().split('T')[0];
      if (!persistedMap.has(dateKey)) {
        persistedMap.set(dateKey, new Map());
      }
      persistedMap.get(dateKey)!.set(point.sectorSymbol, point);
    }

    for (const point of live.dataPoints) {
      const dateKey = point.date.toISOString().split('T')[0];
      if (!liveMap.has(dateKey)) {
        liveMap.set(dateKey, new Map());
      }
      liveMap.get(dateKey)!.set(point.sectorSymbol, point);
    }

    const allDates = new Set([
      ...Array.from(persistedMap.keys()),
      ...Array.from(liveMap.keys()),
    ]);

    const differences: ComparisonDifference[] = [];

    for (const dateKey of allDates) {
      const persistedSectors =
        persistedMap.get(dateKey) || new Map<string, SectorRotationDataPoint>();
      const liveSectors =
        liveMap.get(dateKey) || new Map<string, SectorRotationDataPoint>();
      const allSectors = new Set([
        ...Array.from(persistedSectors.keys()),
        ...Array.from(liveSectors.keys()),
      ]);

      for (const sectorSymbol of allSectors) {
        const persistedPoint = persistedSectors.get(sectorSymbol);
        const livePoint = liveSectors.get(sectorSymbol);

        const persistedData = persistedPoint
          ? {
              x: persistedPoint.x,
              y: persistedPoint.y,
              relativeStrength: persistedPoint.relativeStrength,
            }
          : null;

        const liveData = livePoint
          ? {
              x: livePoint.x,
              y: livePoint.y,
              relativeStrength: livePoint.relativeStrength,
            }
          : null;

        const diffX =
          persistedData && liveData ? liveData.x - persistedData.x : 0;
        const diffY =
          persistedData && liveData ? liveData.y - persistedData.y : 0;
        const diffRS =
          persistedData && liveData
            ? liveData.relativeStrength - persistedData.relativeStrength
            : 0;

        differences.push({
          date: dateKey,
          sectorSymbol,
          persisted: persistedData,
          live: liveData,
          differences: {
            x: diffX,
            y: diffY,
            relativeStrength: diffRS,
          },
        });
      }
    }

    return differences.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.sectorSymbol.localeCompare(b.sectorSymbol);
    });
  }

  private calculateSummary(
    differences: ComparisonDifference[],
  ): CompareSectorRotationResponseDto['summary'] {
    let matchingDataPoints = 0;
    let differentDataPoints = 0;
    let maxDiffX = 0;
    let maxDiffY = 0;
    let maxDiffRS = 0;

    const tolerance = 0.0001;

    for (const diff of differences) {
      if (diff.persisted && diff.live) {
        const absX = Math.abs(diff.differences.x);
        const absY = Math.abs(diff.differences.y);
        const absRS = Math.abs(diff.differences.relativeStrength);

        if (absX <= tolerance && absY <= tolerance && absRS <= tolerance) {
          matchingDataPoints++;
        } else {
          differentDataPoints++;
        }

        maxDiffX = Math.max(maxDiffX, absX);
        maxDiffY = Math.max(maxDiffY, absY);
        maxDiffRS = Math.max(maxDiffRS, absRS);
      }
    }

    return {
      totalDataPoints: differences.length,
      matchingDataPoints,
      differentDataPoints,
      maxDifference: {
        x: maxDiffX,
        y: maxDiffY,
        relativeStrength: maxDiffRS,
      },
    };
  }
}
