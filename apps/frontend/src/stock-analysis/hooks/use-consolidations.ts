import { useQuery } from "@tanstack/react-query";
import { ConsolidationClient } from "../api/consolidation.client";
import { CONSOLIDATION_QUERY_KEYS } from "../constants";
import type { AnalyzeConsolidationsRequest } from "../api/consolidation.client";

const consolidationClient = new ConsolidationClient();

export function useConsolidations(request: AnalyzeConsolidationsRequest) {
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: CONSOLIDATION_QUERY_KEYS.list({ type: request.type }),
    queryFn: () => consolidationClient.analyzeConsolidations(request),
  });
}
