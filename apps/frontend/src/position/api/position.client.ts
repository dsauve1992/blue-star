import { apiClient } from "../../api/api-instance.ts";
import { ApiResponse } from "../../api/types.ts";
import {
  Position,
  CreatePositionRequest,
  UpdatePositionRequest,
} from "./position.types.ts";

export class PositionClient {
  static async getPositions(): Promise<ApiResponse<Position[]>> {
    return apiClient.get<Position[]>("/positions");
  }

  static async getPosition(id: string): Promise<ApiResponse<Position>> {
    return apiClient.get<Position>(`/positions/${id}`);
  }

  static async createPosition(
    data: CreatePositionRequest,
  ): Promise<ApiResponse<Position>> {
    return apiClient.post<Position>("/positions", data);
  }

  static async updatePosition(
    id: string,
    data: UpdatePositionRequest,
  ): Promise<ApiResponse<Position>> {
    return apiClient.patch<Position>(`/positions/${id}`, data);
  }

  static async deletePosition(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/positions/${id}`);
  }

  static async buyShares(
    positionId: string,
    quantity: number,
  ): Promise<ApiResponse<Position>> {
    return apiClient.post<Position>(`/positions/${positionId}/buy`, {
      quantity,
    });
  }

  static async sellShares(
    positionId: string,
    quantity: number,
  ): Promise<ApiResponse<Position>> {
    return apiClient.post<Position>(`/positions/${positionId}/sell`, {
      quantity,
    });
  }
}
