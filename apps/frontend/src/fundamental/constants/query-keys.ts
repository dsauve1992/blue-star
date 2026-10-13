export const FUNDAMENTAL_QUERY_KEYS = {
  all: ["fundamental"] as const,
  financialReport: (symbol: string) =>
    [...FUNDAMENTAL_QUERY_KEYS.all, "financial-report", symbol] as const,
  earningsExpectations: (symbol: string) =>
    [...FUNDAMENTAL_QUERY_KEYS.all, "earnings-expectations", symbol] as const,
};
