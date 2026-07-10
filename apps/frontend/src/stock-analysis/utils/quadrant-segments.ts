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

export function buildQuadrantSegments(
  history: QuadrantHistoryPoint[],
  firstCandleTime: Time | undefined,
  lastCandleTime: Time | undefined,
): QuadrantSegment[] {
  if (history.length === 0 || !lastCandleTime) return [];

  const lastDate = toDateString(lastCandleTime);
  const firstDate = firstCandleTime ? toDateString(firstCandleTime) : null;
  if (!lastDate) return [];

  const points = firstDate
    ? history.filter((point) => point.date <= lastDate)
    : history;
  if (points.length === 0) return [];

  const segments: QuadrantSegment[] = [];
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const next = points[i + 1];
    const endDate = next ? next.date : lastDate;
    if (endDate <= point.date) continue;

    const startDate =
      firstDate && point.date < firstDate ? firstDate : point.date;
    if (endDate <= startDate) continue;

    const last = segments[segments.length - 1];
    if (last && last.quadrant === point.quadrant) {
      last.endTime = endDate as Time;
    } else {
      segments.push({
        startTime: startDate as Time,
        endTime: endDate as Time,
        quadrant: point.quadrant,
      });
    }
  }

  return segments;
}
