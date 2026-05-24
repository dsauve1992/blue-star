import { useState, useEffect, useMemo } from "react";
import type { AnalyzeConsolidationsResponse } from "../api/consolidation.client";
import type { SectorStatus } from "src/sector-rotation/api/sector-rotation.client";
import { isFavorableIndustryGroup } from "../utils/industry-group-utils";

export type AnalysisType = "daily" | "weekly";
export type IndustryGroupFilterMode = "off" | "filter" | "highlight";

interface UseConsolidationSelectionParams {
  data: AnalyzeConsolidationsResponse | undefined;
  analysisType: AnalysisType;
  industryGroupStatuses: SectorStatus[];
}

export function useConsolidationSelection({
  data,
  analysisType,
  industryGroupStatuses,
}: UseConsolidationSelectionParams) {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [industryGroupFilterMode, setIndustryGroupFilterMode] =
    useState<IndustryGroupFilterMode>("off");

  const consolidations = useMemo(() => {
    const raw = data?.hasData
      ? analysisType === "daily"
        ? data.daily
        : data.weekly
      : [];

    if (
      industryGroupFilterMode === "filter" &&
      industryGroupStatuses.length > 0
    ) {
      return raw.filter((c) =>
        isFavorableIndustryGroup(c.industryGroup, industryGroupStatuses),
      );
    }
    return raw;
  }, [data, analysisType, industryGroupFilterMode, industryGroupStatuses]);

  const currentIndex = consolidations.findIndex(
    (c) => c.tickerFullName === selectedTicker,
  );

  useEffect(() => {
    setSelectedTicker(null);
  }, [analysisType]);

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
    industryGroupFilterMode,
    setIndustryGroupFilterMode,
    consolidations,
    currentIndex,
  };
}
