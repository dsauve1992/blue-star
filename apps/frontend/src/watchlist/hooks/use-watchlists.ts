import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WatchlistClient } from "../api/watchlist.client";
import { WATCHLIST_QUERY_KEYS } from "../constants";
import type {
  CreateWatchlistRequest,
  AddTickerToWatchlistRequest,
  RenameWatchlistRequest,
  ListWatchlistsResponse,
} from "../api/watchlist.client";

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
    onMutate: async ({ watchlistId, ticker }) => {
      await queryClient.cancelQueries({
        queryKey: WATCHLIST_QUERY_KEYS.lists(),
      });

      const previousLists = queryClient.getQueriesData<ListWatchlistsResponse>({
        queryKey: WATCHLIST_QUERY_KEYS.lists(),
      });

      queryClient.setQueriesData<ListWatchlistsResponse>(
        { queryKey: WATCHLIST_QUERY_KEYS.lists() },
        (previous) =>
          previous && {
            ...previous,
            watchlists: previous.watchlists.map((watchlist) =>
              watchlist.id === watchlistId
                ? {
                    ...watchlist,
                    tickers: watchlist.tickers.filter((t) => t !== ticker),
                  }
                : watchlist,
            ),
          },
      );

      return { previousLists };
    },
    onError: (_error, _variables, context) => {
      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: (_data, _error, variables) => {
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

export function useRenameWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      watchlistId,
      request,
    }: {
      watchlistId: string;
      request: RenameWatchlistRequest;
    }) => watchlistClient.renameWatchlist(watchlistId, request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: WATCHLIST_QUERY_KEYS.all });
      queryClient.invalidateQueries({
        queryKey: WATCHLIST_QUERY_KEYS.detail(variables.watchlistId),
      });
    },
  });
}

export function useCopyTicker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      targetWatchlistId,
      ticker,
    }: {
      targetWatchlistId: string;
      ticker: string;
    }) => watchlistClient.addTickerToWatchlist(targetWatchlistId, { ticker }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: WATCHLIST_QUERY_KEYS.all });
      queryClient.invalidateQueries({
        queryKey: WATCHLIST_QUERY_KEYS.detail(variables.targetWatchlistId),
      });
    },
  });
}

export function useMoveTicker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceWatchlistId,
      targetWatchlistId,
      ticker,
    }: {
      sourceWatchlistId: string;
      targetWatchlistId: string;
      ticker: string;
    }) => {
      await watchlistClient.addTickerToWatchlist(targetWatchlistId, { ticker });
      await watchlistClient.removeTickerFromWatchlist(
        sourceWatchlistId,
        ticker,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: WATCHLIST_QUERY_KEYS.all });
      queryClient.invalidateQueries({
        queryKey: WATCHLIST_QUERY_KEYS.detail(variables.sourceWatchlistId),
      });
      queryClient.invalidateQueries({
        queryKey: WATCHLIST_QUERY_KEYS.detail(variables.targetWatchlistId),
      });
    },
  });
}
