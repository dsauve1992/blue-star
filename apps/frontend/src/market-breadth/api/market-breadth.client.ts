import { apiClient } from "../../global/api/api-instance";
import type { MarketBreadthResponse } from "./market-breadth.types";

export class MarketBreadthClient {
  async getBreadth(limit?: number): Promise<MarketBreadthResponse> {
    const response = await apiClient.get<MarketBreadthResponse>(
      "/market-breadth",
      { params: limit != null ? { limit } : undefined },
    );
    return response.data;
  }
}
