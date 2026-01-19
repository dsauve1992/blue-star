import { apiClient } from "src/global/api/api-instance.ts";

export type QuadrantType = "Leading" | "Weakening" | "Lagging" | "Improving";

export interface SectorRotationDataPoint {
  date: string;
  sectorSymbol: string;
  price: number;
  relativeStrength: number;
  x: number;
  y: number;
  quadrant: QuadrantType;
}

export interface SectorRotationResult {
  startDate: string;
  endDate: string;
  dataPoints: SectorRotationDataPoint[];
  sectorSymbols: string[];
}

export interface CalculateSectorRotationRequest {
  sectors?: Array<{ symbol: string; name: string }>;
  startDate?: string;
  endDate?: string;
}

export interface CalculateSectorRotationResponse {
  result: SectorRotationResult;
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

export interface ComparisonSummary {
  totalDataPoints: number;
  matchingDataPoints: number;
  differentDataPoints: number;
  maxDifference: {
    x: number;
    y: number;
    relativeStrength: number;
  };
}

export interface CompareSectorRotationRequest {
  sectors?: Array<{ symbol: string; name: string }>;
  startDate?: string;
  endDate?: string;
}

export interface CompareSectorRotationResponse {
  persisted: SectorRotationResult;
  live: SectorRotationResult;
  differences: ComparisonDifference[];
  summary: ComparisonSummary;
}

export interface SectorStatus {
  name: string;
  quadrant: QuadrantType;
  x: number;
  y: number;
}

export interface LatestSectorStatusResponse {
  sectors: SectorStatus[];
  date: string;
}

export class SectorRotationClient {
  async calculateSectorRotation(
    request: CalculateSectorRotationRequest = {},
  ): Promise<CalculateSectorRotationResponse> {
    const params = new URLSearchParams();

    if (request.sectors) {
      params.append("sectors", JSON.stringify(request.sectors));
    }
    if (request.startDate) {
      params.append("startDate", request.startDate);
    }
    if (request.endDate) {
      params.append("endDate", request.endDate);
    }

    const response = await apiClient.get<CalculateSectorRotationResponse>(
      `/sector-rotation/calculate?${params.toString()}`,
    );
    return response.data;
  }

  async compareSectorRotation(
    request: CompareSectorRotationRequest = {},
  ): Promise<CompareSectorRotationResponse> {
    const params = new URLSearchParams();

    if (request.sectors) {
      params.append("sectors", JSON.stringify(request.sectors));
    }
    if (request.startDate) {
      params.append("startDate", request.startDate);
    }
    if (request.endDate) {
      params.append("endDate", request.endDate);
    }

    const response = await apiClient.get<CompareSectorRotationResponse>(
      `/sector-rotation/compare?${params.toString()}`,
    );
    return response.data;
  }

  async getLatestSectorStatus(): Promise<LatestSectorStatusResponse> {
    const response = await apiClient.get<LatestSectorStatusResponse>(
      `/sector-rotation/latest-status`,
    );
    return response.data;
  }
}
