import { useQuery } from '@tanstack/react-query';
import { LeaderBreadthClient } from '../api/leader-breadth.client';
import { LEADER_BREADTH_QUERY_KEYS } from '../constants/query-keys';

const leaderBreadthClient = new LeaderBreadthClient();

export function useLeaderBreadth() {
  return useQuery({
    queryKey: LEADER_BREADTH_QUERY_KEYS.current(),
    queryFn: () => leaderBreadthClient.getBreadth(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
