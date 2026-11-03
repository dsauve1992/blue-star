import type { Time } from "lightweight-charts";

const MARKET_TIME_ZONE = "America/New_York";

const clockFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: MARKET_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const sessionDateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: MARKET_TIME_ZONE,
  month: "short",
  day: "numeric",
});

const sessionKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: MARKET_TIME_ZONE,
});

const crosshairParts = new Intl.DateTimeFormat("en-US", {
  timeZone: MARKET_TIME_ZONE,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dailyParts = new Intl.DateTimeFormat(undefined, {
  timeZone: "UTC",
  day: "2-digit",
  month: "short",
  year: "2-digit",
});

function partValue(
  format: Intl.DateTimeFormat,
  date: Date,
  type: Intl.DateTimeFormatPartTypes,
): string {
  return format.formatToParts(date).find((p) => p.type === type)?.value ?? "";
}

function toDate(time: Time): Date | null {
  return typeof time === "number" ? new Date(time * 1000) : null;
}

function sessionOpenTimes(times: ReadonlyArray<string | number>): Set<number> {
  const opens = new Set<number>();
  let previousSession = "";
  for (const time of times) {
    if (typeof time !== "number") continue;
    const session = sessionKeyFormat.format(new Date(time * 1000));
    if (session !== previousSession) opens.add(time);
    previousSession = session;
  }
  return opens;
}

export function createIntradayTickFormatter(
  times: ReadonlyArray<string | number>,
) {
  const opens = sessionOpenTimes(times);
  return (time: Time): string | null => {
    const date = toDate(time);
    if (!date) return null;
    if (opens.has(time as number)) return sessionDateFormat.format(date);
    return clockFormat.format(date);
  };
}

export function formatIntradayCrosshair(time: Time): string {
  const date = toDate(time);
  if (date) {
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      partValue(crosshairParts, date, type);
    return `${part("day")} ${part("month")} ${part("hour")}:${part("minute")}`;
  }
  const day = new Date(`${time as string}T00:00:00Z`);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    partValue(dailyParts, day, type);
  return `${part("day")} ${part("month")} '${part("year")}`;
}
