import { useQuery } from "@tanstack/react-query";
import { SectorRotationClient } from "../api/sector-rotation.client";
import { SECTOR_ROTATION_QUERY_KEYS } from "../constants/query-keys";

const sectorRotationClient = new SectorRotationClient();

export function useLatestSectorStatus(enabled: boolean = true) {
  return useQuery({
    queryKey: SECTOR_ROTATION_QUERY_KEYS.latestStatus(),
    queryFn: () => sectorRotationClient.getLatestSectorStatus(),
    enabled: enabled,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
