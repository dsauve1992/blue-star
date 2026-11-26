export function formatSessionDate(sessionDate: string): string {
  return new Date(`${sessionDate}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatTimestampDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}
