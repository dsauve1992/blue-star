import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { useMarketHealth } from "../hooks/use-market-health";
import type { MarketHealthStatus } from "../api/market-health.types";

const barClasses =
  "sticky top-0 z-50 flex h-[var(--app-top-offset)] items-center gap-1.5 whitespace-nowrap px-3 text-xs font-medium";

const statusColorMap: Record<MarketHealthStatus, string> = {
  GOOD: "bg-green-700 text-white",
  WARNING: "bg-amber-500 text-slate-900",
  BAD: "bg-red-700 text-white",
};

const statusVerdictMap: Record<MarketHealthStatus, string> = {
  GOOD: "Good",
  WARNING: "Warning",
  BAD: "Bad",
};

const statusLabelMap: Record<MarketHealthStatus, string> = {
  GOOD: "favorable",
  WARNING: "mixed, caution",
  BAD: "avoid new positions",
};

function AuthenticatedMarketHealthBar() {
  const { data, isLoading } = useMarketHealth();

  if (isLoading) {
    return (
      <div className="sticky top-0 z-50 h-[var(--app-top-offset)] bg-slate-200 dark:bg-slate-700 animate-pulse" />
    );
  }

  if (!data) {
    return (
      <div role="status" className={`${barClasses} bg-slate-600 text-white`}>
        SPY trend unavailable
      </div>
    );
  }

  const asOf = new Date(data.computedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const verdict = `SPY trend: ${statusVerdictMap[data.status]}`;
  const description = statusLabelMap[data.status];

  return (
    <div
      role="status"
      className={`${barClasses} ${statusColorMap[data.status]} transition-colors duration-300`}
      aria-label={`${verdict} · ${description} · as of ${asOf}`}
    >
      <span className="shrink-0">{verdict}</span>
      <span className="min-w-0 truncate">· {description}</span>
      <span className="shrink-0">· as of {asOf}</span>
    </div>
  );
}

export function MarketHealthBar() {
  const { isAuthenticated } = useKindeAuth();

  return isAuthenticated ? <AuthenticatedMarketHealthBar /> : null;
}
