export const SECTOR_ROTATION_QUERY_KEYS = {
  all: ['sector-rotation'] as const,
  calculate: (request: {
    sectors?: Array<{ symbol: string; name: string }>;
    startDate?: string;
    endDate?: string;
    lookbackWeeks?: number;
    momentumWeeks?: number;
    normalizationWindowWeeks?: number;
    benchmarkType?: "equal-weighted" | "spx";
  }) => [...SECTOR_ROTATION_QUERY_KEYS.all, 'calculate', request] as const,
};

