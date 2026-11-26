import { Badge } from "src/global/design-system";
import type { Tier } from "../api/potent-scan.client";

const TIER_VARIANT = {
  Lead: "success",
  Mediocre: "warning",
  Lag: "danger",
} as const;

export function TierBadge({ tier }: { tier: Tier | null }) {
  if (!tier) {
    return <span className="text-slate-400">—</span>;
  }
  return <Badge variant={TIER_VARIANT[tier]}>{tier}</Badge>;
}
