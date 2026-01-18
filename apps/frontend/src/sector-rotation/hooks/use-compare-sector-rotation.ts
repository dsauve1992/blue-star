import { useQuery } from "@tanstack/react-query";
import {
  type CompareSectorRotationRequest,
  SectorRotationClient,
} from "../api/sector-rotation.client";
import { SECTOR_ROTATION_QUERY_KEYS } from "../constants/query-keys";

const sectorRotationClient = new SectorRotationClient();

export function useCompareSectorRotation(
  request: CompareSectorRotationRequest = {},
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: SECTOR_ROTATION_QUERY_KEYS.compare(request),
    queryFn: () => sectorRotationClient.compareSectorRotation(request),
    enabled: enabled,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
