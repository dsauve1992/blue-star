import { useState, useEffect, useMemo } from "react";
import type { AnalyzeConsolidationsResponse } from "../api/consolidation.client";
import type { SectorStatus } from "src/sector-rotation/api/sector-rotation.client";
import { isFavorableSector } from "../utils/sector-utils";

export type AnalysisType = "daily" | "weekly";
export type SectorFilterMode = "off" | "filter" | "highlight";

interface UseConsolidationSelectionParams {
  data: AnalyzeConsolidationsResponse | undefined;
  analysisType: AnalysisType;
  sectorStatuses: SectorStatus[];
}

export function useConsolidationSelection({
  data,
  analysisType,
  sectorStatuses,
}: UseConsolidationSelectionParams) {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [sectorFilterMode, setSectorFilterMode] =
    useState<SectorFilterMode>("off");

  const consolidations = useMemo(() => {
    const raw = data?.hasData
      ? analysisType === "daily"
        ? data.daily
        : data.weekly
      : [];

    if (sectorFilterMode === "filter" && sectorStatuses.length > 0) {
      return raw.filter((c) => isFavorableSector(c.sector, sectorStatuses));
    }
    return raw;
  }, [data, analysisType, sectorFilterMode, sectorStatuses]);

  const currentIndex = consolidations.findIndex(
    (c) => c.tickerFullName === selectedTicker,
  );

  // Reset selection when analysis type changes
  useEffect(() => {
    setSelectedTicker(null);
  }, [analysisType]);

  // Auto-select first ticker when data loads or filter changes
  useEffect(() => {
    if (consolidations.length > 0) {
      if (
        !selectedTicker ||
        !consolidations.some((c) => c.tickerFullName === selectedTicker)
      ) {
        setSelectedTicker(consolidations[0].tickerFullName);
      }
    }
  }, [consolidations]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    selectedTicker,
    setSelectedTicker,
    sectorFilterMode,
    setSectorFilterMode,
    consolidations,
    currentIndex,
  };
}
