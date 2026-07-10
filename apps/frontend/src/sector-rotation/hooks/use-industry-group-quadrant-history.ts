import { useQuery } from "@tanstack/react-query";
import {
  SectorRotationClient,
  type QuadrantType,
} from "../api/sector-rotation.client";
import { SECTOR_ROTATION_QUERY_KEYS } from "../constants/query-keys";
import { useIndustryGroupSymbol } from "./use-industry-group-symbol";

const INDUSTRY_GROUP_UNIVERSE_ID = "gics-industry-group";

const sectorRotationClient = new SectorRotationClient();

export interface QuadrantHistoryPoint {
  date: string;
  quadrant: QuadrantType;
}

export function useIndustryGroupQuadrantHistory(
  industryGroup: string | null,
  startDate?: string,
  endDate?: string,
) {
  const symbol = useIndustryGroupSymbol(industryGroup);

  return useQuery({
    queryKey: SECTOR_ROTATION_QUERY_KEYS.quadrantHistory(
      industryGroup ?? "",
      symbol ?? "",
      startDate,
      endDate,
    ),
    queryFn: async (): Promise<QuadrantHistoryPoint[]> => {
      const response = await sectorRotationClient.calculateSectorRotation({
        universeId: INDUSTRY_GROUP_UNIVERSE_ID,
        sectors: [{ symbol: symbol!, name: industryGroup! }],
        startDate,
        endDate,
      });
      return response.result.dataPoints
        .filter((point) => point.sectorSymbol === symbol)
        .map((point) => ({ date: point.date, quadrant: point.quadrant }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!industryGroup && !!symbol,
    staleTime: 60 * 60 * 1000,
    retry: 2,
  });
}
