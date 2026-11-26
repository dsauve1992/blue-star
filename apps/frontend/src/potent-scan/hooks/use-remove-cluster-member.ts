import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PotentScanClient } from "../api/potent-scan.client";
import { POTENT_SCAN_QUERY_KEYS } from "../constants/query-keys";

const client = new PotentScanClient();

export function useRemoveClusterMember(clusterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ticker: string) => client.removeMember(clusterId, ticker),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POTENT_SCAN_QUERY_KEYS.all });
    },
  });
}
