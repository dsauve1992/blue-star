import { useQuery } from "@tanstack/react-query";
import {
  type CalculateSectorRotationRequest,
  SectorRotationClient,
} from "../api/sector-rotation.client";
import { SECTOR_ROTATION_QUERY_KEYS } from "../constants/query-keys";

const sectorRotationClient = new SectorRotationClient();

export function useSectorRotation(
  request: CalculateSectorRotationRequest = {},
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: SECTOR_ROTATION_QUERY_KEYS.calculate(request),
    queryFn: () => sectorRotationClient.calculateSectorRotation(request),
    enabled: enabled,
    staleTime: 60 * 60 * 1000,
    retry: 2,
  });
}
