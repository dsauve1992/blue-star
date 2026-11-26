import type { ClusterStatus } from "../api/potent-scan.client";

export const POTENT_SCAN_QUERY_KEYS = {
  all: ["potent-scan"] as const,
  scanDates: () => [...POTENT_SCAN_QUERY_KEYS.all, "scan-dates"] as const,
  scan: (scanDate: string) =>
    [...POTENT_SCAN_QUERY_KEYS.all, "scan", scanDate] as const,
  clusters: (status: ClusterStatus) =>
    [...POTENT_SCAN_QUERY_KEYS.all, "clusters", status] as const,
  cluster: (clusterId: string) =>
    [...POTENT_SCAN_QUERY_KEYS.all, "cluster", clusterId] as const,
  proposals: (scanDate: string) =>
    [...POTENT_SCAN_QUERY_KEYS.all, "proposals", scanDate] as const,
} as const;
