import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PotentScanClient,
  type UpdateClusterRequest,
} from "../api/potent-scan.client";
import { POTENT_SCAN_QUERY_KEYS } from "../constants/query-keys";

const client = new PotentScanClient();

export function useUpdateCluster(clusterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateClusterRequest) =>
      client.updateCluster(clusterId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POTENT_SCAN_QUERY_KEYS.all });
    },
  });
}
