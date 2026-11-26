import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PotentScanClient,
  type AcceptProposalRequest,
} from "../api/potent-scan.client";
import { POTENT_SCAN_QUERY_KEYS } from "../constants/query-keys";

const client = new PotentScanClient();

export function useAcceptProposal(proposalId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: AcceptProposalRequest) =>
      client.acceptProposal(proposalId, request),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: POTENT_SCAN_QUERY_KEYS.all }),
  });
}
