import type { SeriesMarker, Time } from "lightweight-charts";
import type { ChartCandleDto } from "src/market-data/api/chart-data.client";
import type { ClusterMemberDetail } from "../api/potent-scan.client";

const MARKET_TIME_ZONE = "America/New_York";

function marketDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString("en-CA", {
    timeZone: MARKET_TIME_ZONE,
  });
}

export function joinMarkers(
  candles: ChartCandleDto[],
  member: ClusterMemberDetail,
  label?: string,
): SeriesMarker<Time>[] {
  const joinDate = member.tiers[0]?.date ?? marketDate(member.joinedAt);
  const joinCandle = candles
    .filter((candle) => String(candle.time) <= joinDate)
    .at(-1);
  if (!joinCandle) return [];
  return [
    {
      time: joinCandle.time as Time,
      position: "belowBar",
      shape: "arrowUp",
      color: "#38bdf8",
      text: label,
    },
  ];
}
