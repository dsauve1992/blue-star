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
}
