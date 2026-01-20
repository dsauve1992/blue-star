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

export interface CalculateSectorRotationApiResponseDto {
  result: SectorRotationResultDto;
}

export interface CompareSectorRotationApiResponseDto {
  persisted: SectorRotationResultDto;
  live: SectorRotationResultDto;
  differences: ComparisonDifferenceDto[];
  summary: ComparisonSummaryDto;
}

export interface ComparisonDifferenceDto {
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

export interface ComparisonSummaryDto {
  totalDataPoints: number;
  matchingDataPoints: number;
  differentDataPoints: number;
  maxDifference: {
    x: number;
    y: number;
    relativeStrength: number;
  };
}
export interface SectorStatusDto {
  name: string;
  quadrant: QuadrantType;
  x: number;
  y: number;
}

export interface LatestSectorStatusApiResponseDto {
  sectors: SectorStatusDto[];
  date: string;
}

export interface SectorStatusDto {
  name: string;
  quadrant: QuadrantType;
  x: number;
  y: number;
}

export interface LatestSectorStatusApiResponseDto {
  sectors: SectorStatusDto[];
  date: string;
}