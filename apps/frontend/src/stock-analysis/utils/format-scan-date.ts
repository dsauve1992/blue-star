export function formatScanDate(scanDate: string): string {
  return new Date(`${scanDate}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
