import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ConsolidationClient } from '../api/consolidation.client';
import { CONSOLIDATION_QUERY_KEYS } from '../constants';
import type { RunConsolidationAnalysisRequest } from '../api/consolidation.client';

const consolidationClient = new ConsolidationClient();

export function useRunConsolidationAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RunConsolidationAnalysisRequest) =>
      consolidationClient.runAnalysis(request),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: CONSOLIDATION_QUERY_KEYS.all,
      });
    },
  });
}

