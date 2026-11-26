import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PotentScanClient,
  type CreateClusterRequest,
} from "../api/potent-scan.client";
import { POTENT_SCAN_QUERY_KEYS } from "../constants/query-keys";

const client = new PotentScanClient();

export function useCreateCluster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateClusterRequest) =>
      client.createCluster(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POTENT_SCAN_QUERY_KEYS.all });
    },
  });
}
