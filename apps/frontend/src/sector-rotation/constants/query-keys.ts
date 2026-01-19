export const SECTOR_ROTATION_QUERY_KEYS = {
  all: ["sector-rotation"] as const,
  calculate: (request: {
    sectors?: Array<{ symbol: string; name: string }>;
    startDate?: string;
    endDate?: string;
  }) => [...SECTOR_ROTATION_QUERY_KEYS.all, "calculate", request] as const,
  compare: (request: {
    sectors?: Array<{ symbol: string; name: string }>;
    startDate?: string;
    endDate?: string;
  }) => [...SECTOR_ROTATION_QUERY_KEYS.all, "compare", request] as const,
  latestStatus: () =>
    [...SECTOR_ROTATION_QUERY_KEYS.all, "latest-status"] as const,
};
