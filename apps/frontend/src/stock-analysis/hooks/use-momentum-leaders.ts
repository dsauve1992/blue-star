import { useQuery } from "@tanstack/react-query";
import { MomentumLeadersClient } from "../api/momentum-leaders.client";
import { MOMENTUM_LEADERS_QUERY_KEYS } from "../constants";

const client = new MomentumLeadersClient();

export function useMomentumLeaders() {
  return useQuery({
    queryKey: MOMENTUM_LEADERS_QUERY_KEYS.latest(),
    queryFn: () => client.getLatest(),
  });
}
