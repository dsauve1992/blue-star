import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  WatchlistMonitoringClient,
  MonitoringType,
} from '../api/watchlist-monitoring.client';
import { WATCHLIST_MONITORING_QUERY_KEYS } from '../constants';

const monitoringClient = new WatchlistMonitoringClient();

export function useMonitoringStatus(watchlistId: string | null) {
  return useQuery({
    queryKey: WATCHLIST_MONITORING_QUERY_KEYS.detail(watchlistId ?? ''),
    queryFn: () => monitoringClient.getMonitoringStatus(watchlistId!),
    enabled: !!watchlistId,
  });
}

export function useActivateMonitoring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      watchlistId,
      type,
    }: {
      watchlistId: string;
      type: MonitoringType;
    }) => monitoringClient.activateMonitoring(watchlistId, { type }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: WATCHLIST_MONITORING_QUERY_KEYS.detail(variables.watchlistId),
      });
    },
  });
}

export function useDeactivateMonitoring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      watchlistId,
      type,
    }: {
      watchlistId: string;
      type: MonitoringType;
    }) => monitoringClient.deactivateMonitoring(watchlistId, { type }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: WATCHLIST_MONITORING_QUERY_KEYS.detail(variables.watchlistId),
      });
    },
  });
}
