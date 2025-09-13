import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercentage(value: number, decimals = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatLargeNumber(value: number): string {
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`
  }
  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`
  }
  if (value >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K`
  }
  return value.toString()
}

export function getChangeColor(change: number): string {
  if (change > 0) return 'text-success-500'
  if (change < 0) return 'text-danger-500'
  return 'text-text-tertiary'
}

export function getChangeBgColor(change: number): string {
  if (change > 0) return 'bg-success-500/10'
  if (change < 0) return 'bg-danger-500/10'
  return 'bg-surface-tertiary'
}
