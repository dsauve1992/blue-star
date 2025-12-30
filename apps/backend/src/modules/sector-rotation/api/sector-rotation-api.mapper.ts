import { Injectable } from '@nestjs/common';
import { SectorRotationResult } from '../domain/value-objects/sector-rotation-result';
import {
  SectorRotationResultDto,
  SectorRotationDataPointDto,
  CalculateSectorRotationApiResponseDto,
} from './sector-rotation-api.dto';
import { CalculateSectorRotationResponseDto } from '../use-cases/calculate-sector-rotation.use-case';

@Injectable()
export class SectorRotationApiMapper {
  mapCalculateSectorRotationResponse(
    response: CalculateSectorRotationResponseDto,
  ): CalculateSectorRotationApiResponseDto {
    return {
      result: this.mapSectorRotationResult(response.result),
    };
  }

  private mapSectorRotationResult(
    result: SectorRotationResult,
  ): SectorRotationResultDto {
    return {
      startDate: result.startDate.toISOString(),
      endDate: result.endDate.toISOString(),
      dataPoints: result.dataPoints.map((point) =>
        this.mapSectorRotationDataPoint(point),
      ),
      sectorSymbols: result.sectorSymbols,
    };
  }

  private mapSectorRotationDataPoint(
    point: {
      date: Date;
      sectorSymbol: string;
      price: number;
      relativeStrength: number;
      x: number;
      y: number;
      quadrant: { value: string };
    },
  ): SectorRotationDataPointDto {
    return {
      date: point.date.toISOString(),
      sectorSymbol: point.sectorSymbol,
      price: point.price,
      relativeStrength: point.relativeStrength,
      x: point.x,
      y: point.y,
      quadrant: point.quadrant.value as SectorRotationDataPointDto['quadrant'],
    };
  }
}

