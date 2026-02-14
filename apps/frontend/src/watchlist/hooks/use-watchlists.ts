import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WatchlistClient } from '../api/watchlist.client';
import { WATCHLIST_QUERY_KEYS } from '../constants';
import type {
  CreateWatchlistRequest,
  AddTickerToWatchlistRequest,
} from '../api/watchlist.client';

const watchlistClient = new WatchlistClient();

export function useWatchlists() {
  return useQuery({
    queryKey: WATCHLIST_QUERY_KEYS.lists(),
    queryFn: () => watchlistClient.listWatchlists(),
  });
}

export function useWatchlistById(watchlistId: string) {
  return useQuery({
    queryKey: WATCHLIST_QUERY_KEYS.detail(watchlistId),
    queryFn: () => watchlistClient.getWatchlistById(watchlistId),
    enabled: !!watchlistId,
  });
}

export function useCreateWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateWatchlistRequest) =>
      watchlistClient.createWatchlist(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WATCHLIST_QUERY_KEYS.all });
    },
  });
}

export function useAddTickerToWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      watchlistId,
      request,
    }: {
      watchlistId: string;
      request: AddTickerToWatchlistRequest;
    }) => watchlistClient.addTickerToWatchlist(watchlistId, request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: WATCHLIST_QUERY_KEYS.all });
      queryClient.invalidateQueries({
        queryKey: WATCHLIST_QUERY_KEYS.detail(variables.watchlistId),
      });
    },
  });
}

export function useRemoveTickerFromWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      watchlistId,
      ticker,
    }: {
      watchlistId: string;
      ticker: string;
    }) => watchlistClient.removeTickerFromWatchlist(watchlistId, ticker),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: WATCHLIST_QUERY_KEYS.all });
      queryClient.invalidateQueries({
        queryKey: WATCHLIST_QUERY_KEYS.detail(variables.watchlistId),
      });
    },
  });
}

export function useDeleteWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (watchlistId: string) =>
      watchlistClient.deleteWatchlist(watchlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WATCHLIST_QUERY_KEYS.all });
    },
  });
}

