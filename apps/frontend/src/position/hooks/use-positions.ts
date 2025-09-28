import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PositionClient } from '../api/position.client';
import { POSITION_QUERY_KEYS } from '../constants';
import type {
  OpenPositionRequest,
  SetStopLossRequest,
  SellSharesRequest,
  BuySharesRequest,
} from '../api/position.client';

const positionClient = new PositionClient();

export function usePositions() {
  return useQuery({
    queryKey: POSITION_QUERY_KEYS.lists(),
    queryFn: () => positionClient.getPositions(),
  });
}

export function useOpenPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: OpenPositionRequest) =>
      positionClient.openPosition(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POSITION_QUERY_KEYS.all });
    },
  });
}

export function useSetStopLoss() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      positionId,
      request,
    }: {
      positionId: string;
      request: SetStopLossRequest;
    }) => positionClient.setStopLoss(positionId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POSITION_QUERY_KEYS.all });
    },
  });
}

export function useSellShares() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      positionId,
      request,
    }: {
      positionId: string;
      request: SellSharesRequest;
    }) => positionClient.sellShares(positionId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POSITION_QUERY_KEYS.all });
    },
  });
}

export function useBuyShares() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      positionId,
      request,
    }: {
      positionId: string;
      request: BuySharesRequest;
    }) => positionClient.buyShares(positionId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POSITION_QUERY_KEYS.all });
    },
  });
}
