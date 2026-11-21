export const BROKERAGE_QUERY_KEYS = {
  all: ["brokerage"] as const,
  accounts: () => [...BROKERAGE_QUERY_KEYS.all, "accounts"] as const,
  journals: () => [...BROKERAGE_QUERY_KEYS.all, "journal"] as const,
  journal: (accountId: string) =>
    [...BROKERAGE_QUERY_KEYS.journals(), accountId] as const,
} as const;
