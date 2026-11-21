export function formatR(value: number | null): string {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}R`;
}

export function formatRatio(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}

export function formatPercent(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(0)}%`;
}

export function formatMoney(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export function formatPrice(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}

export function formatDate(value: string | null): string {
  if (value === null) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function signColor(value: number | null): string {
  if (value === null || value === 0)
    return "text-slate-500 dark:text-slate-400";
  return value > 0
    ? "text-success-600 dark:text-success-400"
    : "text-danger-600 dark:text-danger-400";
}
