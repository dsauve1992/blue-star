import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MomentumLeadersClient } from "../api/momentum-leaders.client";
import { MOMENTUM_LEADERS_QUERY_KEYS } from "../constants";

const client = new MomentumLeadersClient();

export function useRunMomentumLeaders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => client.run(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: MOMENTUM_LEADERS_QUERY_KEYS.all,
      });
    },
  });
}
