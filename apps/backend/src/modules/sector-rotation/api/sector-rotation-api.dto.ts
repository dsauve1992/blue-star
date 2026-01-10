import { QuadrantType } from '../domain/value-objects/quadrant';

export interface SectorRotationDataPointDto {
  date: string;
  sectorSymbol: string;
  price: number;
  relativeStrength: number;
  x: number;
  y: number;
  quadrant: QuadrantType;
}

export interface SectorRotationResultDto {
  startDate: string;
  endDate: string;
  dataPoints: SectorRotationDataPointDto[];
  sectorSymbols: string[];
}

export interface CalculateSectorRotationApiRequestDto {
  sectors: Array<{ symbol: string; name: string }>;
  startDate: string;
  endDate: string;
  benchmarkType?: string;
}

export interface CalculateSectorRotationApiResponseDto {
  result: SectorRotationResultDto;
}
