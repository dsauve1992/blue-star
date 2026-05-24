export const SECTOR_ROTATION_QUERY_KEYS = {
  all: ["sector-rotation"] as const,
  calculate: (request: {
    sectors?: Array<{ symbol: string; name: string }>;
    startDate?: string;
    endDate?: string;
    universeId?: string;
  }) => [...SECTOR_ROTATION_QUERY_KEYS.all, "calculate", request] as const,
  compare: (request: {
    sectors?: Array<{ symbol: string; name: string }>;
    startDate?: string;
    endDate?: string;
    universeId?: string;
  }) => [...SECTOR_ROTATION_QUERY_KEYS.all, "compare", request] as const,
  latestStatus: (universeId?: string) =>
    [
      ...SECTOR_ROTATION_QUERY_KEYS.all,
      "latest-status",
      universeId ?? null,
    ] as const,
  universes: () =>
    [...SECTOR_ROTATION_QUERY_KEYS.all, "universes"] as const,
};
