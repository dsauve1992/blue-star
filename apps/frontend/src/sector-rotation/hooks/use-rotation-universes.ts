import { useQuery } from "@tanstack/react-query";
import { SectorRotationClient } from "../api/sector-rotation.client";
import { SECTOR_ROTATION_QUERY_KEYS } from "../constants/query-keys";

const sectorRotationClient = new SectorRotationClient();

export function useRotationUniverses() {
  return useQuery({
    queryKey: SECTOR_ROTATION_QUERY_KEYS.universes(),
    queryFn: () => sectorRotationClient.listUniverses(),
    // Universes are config — long stale time is fine.
    staleTime: 60 * 60 * 1000,
    retry: 2,
  });
}
