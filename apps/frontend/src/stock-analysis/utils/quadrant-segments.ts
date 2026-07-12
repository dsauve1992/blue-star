import type { Time } from "lightweight-charts";
import type { QuadrantSegment } from "src/market-data/components/chart-primitives/QuadrantBackground";
import type { QuadrantHistoryPoint } from "src/sector-rotation/hooks/use-industry-group-quadrant-history";

function toDateString(time: Time): string | null {
  if (typeof time === "string") return time;
  if (typeof time === "number") {
    return new Date(time * 1000).toISOString().slice(0, 10);
  }
  return null;
}

interface CandleTime {
  time: Time;
  date: string;
}

function toSortedCandleTimes(candleTimes: readonly Time[]): CandleTime[] {
  const result: CandleTime[] = [];
  for (const time of candleTimes) {
    const date = toDateString(time);
    if (date) result.push({ time, date });
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

// Boundaries must land on a real candle: the renderer's timeToCoordinate returns
// null for any time that isn't an actual bar, and weekly quadrant points are
// dated to the week's Monday, which is often a market holiday with no candle.
function firstCandleAtOrAfter(
  candles: CandleTime[],
  date: string,
): CandleTime | null {
  let lo = 0;
  let hi = candles.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (candles[mid].date < date) lo = mid + 1;
    else hi = mid;
  }
  return lo < candles.length ? candles[lo] : null;
}

export function buildQuadrantSegments(
  history: QuadrantHistoryPoint[],
  candleTimes: readonly Time[],
): QuadrantSegment[] {
  if (history.length === 0) return [];

  const candles = toSortedCandleTimes(candleTimes);
  if (candles.length === 0) return [];

  const firstDate = candles[0].date;
  const lastCandle = candles[candles.length - 1];
  const lastDate = lastCandle.date;

  const points = history.filter((point) => point.date <= lastDate);
  if (points.length === 0) return [];

  const segments: QuadrantSegment[] = [];
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const next = points[i + 1];

    const startDate = point.date < firstDate ? firstDate : point.date;
    const startCandle = firstCandleAtOrAfter(candles, startDate);
    if (!startCandle) continue;

    const nextBoundaryDate = next ? next.date : null;
    const endCandle =
      nextBoundaryDate && nextBoundaryDate <= lastDate
        ? (firstCandleAtOrAfter(candles, nextBoundaryDate) ?? lastCandle)
        : lastCandle;

    if (endCandle.date <= startCandle.date) continue;

    const last = segments[segments.length - 1];
    if (last && last.quadrant === point.quadrant) {
      last.endTime = endCandle.time;
    } else {
      segments.push({
        startTime: startCandle.time,
        endTime: endCandle.time,
        quadrant: point.quadrant,
      });
    }
  }

  return segments;
}
