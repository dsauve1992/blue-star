import { TickMarkType, type Time } from "lightweight-charts";

const MARKET_TIME_ZONE = "America/New_York";

const clockFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: MARKET_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: MARKET_TIME_ZONE,
  day: "numeric",
});

const monthFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: MARKET_TIME_ZONE,
  month: "short",
});

const yearFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: MARKET_TIME_ZONE,
  year: "numeric",
});

const crosshairParts = new Intl.DateTimeFormat("en-US", {
  timeZone: MARKET_TIME_ZONE,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dailyParts = new Intl.DateTimeFormat("en-US", {
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

function formatDailyCrosshair(time: Time): string {
  const date =
    typeof time === "string"
      ? new Date(`${time}T00:00:00Z`)
      : typeof time === "object"
        ? new Date(Date.UTC(time.year, time.month - 1, time.day))
        : null;
  if (!date || Number.isNaN(date.getTime())) return String(time);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    partValue(dailyParts, date, type);
  return `${part("day")} ${part("month")} '${part("year")}`;
}

export function formatIntradayTick(
  time: Time,
  tickMarkType: TickMarkType,
): string | null {
  const date = toDate(time);
  if (!date) return null;
  switch (tickMarkType) {
    case TickMarkType.Year:
      return yearFormat.format(date);
    case TickMarkType.Month:
      return monthFormat.format(date);
    case TickMarkType.DayOfMonth:
      return dayFormat.format(date);
    default:
      return clockFormat.format(date);
  }
}

export function formatIntradayCrosshair(time: Time): string {
  const date = toDate(time);
  if (!date) return formatDailyCrosshair(time);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    partValue(crosshairParts, date, type);
  return `${part("day")} ${part("month")} ${part("hour")}:${part("minute")}`;
}
