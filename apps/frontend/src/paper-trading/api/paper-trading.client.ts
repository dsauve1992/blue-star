import { apiClient } from "../../global/api/api-instance";
import type {
  PaperTrade,
  PaperTradeStatus,
  PaperTradingStats,
} from "./paper-trading.types";

export class PaperTradingClient {
  async getStats(): Promise<PaperTradingStats> {
    const response = await apiClient.get<PaperTradingStats>(
      "/paper-trading/stats",
    );
    return response.data;
  }

  async getTrades(status?: PaperTradeStatus): Promise<PaperTrade[]> {
    const response = await apiClient.get<PaperTrade[]>(
      "/paper-trading/trades",
      {
        params: status ? { status } : undefined,
      },
    );
    return response.data;
  }
}
