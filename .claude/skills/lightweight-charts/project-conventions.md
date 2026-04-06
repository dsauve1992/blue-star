# Project-Specific Conventions (Blue Star)

## Color Scheme
- Up candles: `#3b82f6` (blue-500)
- Down candles: `#ef4444` (red-400) or `#f472b6` (pink-400)
- Volume up/down: same colors with opacity
- Grid/border: `rgba(51, 65, 85, 0.15)` to `rgba(51, 65, 85, 0.5)`
- Crosshair: `rgba(148, 163, 184, 0.3)` to `rgba(148, 163, 184, 0.4)`
- RS line: `#22c55e` (green-500), RS SMA: `#f59e0b` (amber-500)
- Font: `JetBrains Mono`, 10–11px

## Existing Components
- **`LightweightChart`** (`market-data/components/LightweightChart.tsx`) — reusable chart with MAs, volume, legend, tooltip, export, load-more
- **`CandlestickChart`** (`global/components/CandlestickChart.tsx`) — simpler legacy chart
- **`ChartSandbox`** (`market-data/pages/ChartSandbox.tsx`) — advanced demo with RS sub-pane, synced crosshairs, timeframe selector

## Data Flow
- API client: `market-data/api/chart-data.client.ts` — `ChartCandleDto { time, open, high, low, close, volume }`
- Hook: `market-data/hooks/use-chart-data.ts` — React Query wrapper with load-more (+200 bars)
- Intervals: `"1" | "5" | "15" | "30" | "60" | "D" | "W" | "M"`
