import { apiClient } from "../../global/api/api-instance";

export interface ConsolidationResult {
  symbol: string;
  isNew: boolean;
  tickerFullName: string;
  timeframe: "daily" | "weekly";
  themes: string[];
}

export interface AnalyzeConsolidationsRequest {
  type: "daily" | "weekly";
}

export interface AnalyzeConsolidationsResponse {
  daily: ConsolidationResult[];
  weekly: ConsolidationResult[];
  dailyCount: number;
  weeklyCount: number;
  hasData: boolean;
  runStatus?: "completed" | "running" | "failed" | "not_found";
  errorMessage?: string;
}

export interface RunConsolidationAnalysisRequest {
  type: "daily" | "weekly";
}

export interface RunConsolidationAnalysisResponse {
  message: string;
}

export class ConsolidationClient {
  async analyzeConsolidations(
    request: AnalyzeConsolidationsRequest,
  ): Promise<AnalyzeConsolidationsResponse> {
    const params = new URLSearchParams();
    if (request.type) {
      params.append("type", request.type);
    }

    const queryString = params.toString();
    const url = `/stock-analysis/consolidations${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient.get<AnalyzeConsolidationsResponse>(url, {
      timeout: 600000,
    });
    return response.data;
  }

  async runAnalysis(
    request: RunConsolidationAnalysisRequest,
  ): Promise<RunConsolidationAnalysisResponse> {
    const response = await apiClient.post<
      RunConsolidationAnalysisResponse,
      RunConsolidationAnalysisRequest
    >("/stock-analysis/consolidations/run", request, {
      timeout: 600000,
    });
    return response.data;
  }
}
