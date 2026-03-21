/**
 * Replays the breakout detection logic against real 5m market data.
 * Run: cd apps/backend && npx ts-node scripts/sndk-breakout-replay.ts <TICKER> <YYYY-MM-DD>
 * Example: npx ts-node scripts/sndk-breakout-replay.ts SNDK 2026-01-02
 */

import YahooFinance from 'yahoo-finance2';
import { DateTime } from 'luxon';

const MARKET_TZ = 'America/Toronto';
const EMA_PERIOD = 9;
const EMA_MINIMUM_BARS = 9;
const AVERAGE_VOLUME_LOOKBACK_SESSIONS = 10;
const INTRADAY_LOOKBACK_CALENDAR_DAYS = 30;

interface Bar {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function isDuringMarketHours(date: Date): boolean {
  const t = DateTime.fromJSDate(date, { zone: MARKET_TZ });
  const totalMinutes = t.hour * 60 + t.minute;
  return totalMinutes >= 9 * 60 + 30 && totalMinutes <= 16 * 60;
}

function getMarketDateKey(date: Date): string {
  return DateTime.fromJSDate(date, { zone: MARKET_TZ }).toFormat('yyyy-LL-dd');
}

function formatET(date: Date): string {
  return DateTime.fromJSDate(date, { zone: MARKET_TZ }).toFormat('HH:mm');
}

function sessionEma9(bars: Bar[]): Map<number, number> {
  const emaMap = new Map<number, number>();
  let ema: number | null = null;
  const multiplier = 2 / (EMA_PERIOD + 1);
  for (const b of bars) {
    ema = ema === null ? b.close : (b.close - ema) * multiplier + ema;
    emaMap.set(b.date.getTime(), ema);
  }
  return emaMap;
}

// values[0] = oldest session, values[N-1] = most recent → weight = i + 1
function weightedMean(values: number[]): number {
  let weightedSum = 0;
  let totalWeight = 0;
  for (let i = 0; i < values.length; i++) {
    weightedSum += (i + 1) * values[i];
    totalWeight += i + 1;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

function getPriorSessionHigh(
  currentKey: string,
  sessions: Map<string, Bar[]>,
  orderedKeys: string[],
): number | undefined {
  const priorKey = orderedKeys.filter((k) => k < currentKey).at(-1);
  if (!priorKey) return undefined;
  const bars = sessions.get(priorKey) ?? [];
  return bars.length === 0 ? undefined : Math.max(...bars.map((b) => b.high));
}

function computeBaseline(
  currentKey: string,
  visibleBars: Bar[],
  sessions: Map<string, Bar[]>,
  orderedKeys: string[],
): { baseline: number; eligible: number } {
  const barsElapsed = visibleBars.length;
  const priorKeys = orderedKeys
    .filter((k) => k !== currentKey)
    .filter((k) => (sessions.get(k) ?? []).length >= barsElapsed);

  if (priorKeys.length < AVERAGE_VOLUME_LOOKBACK_SESSIONS) {
    return { baseline: 0, eligible: priorKeys.length };
  }

  const lookbackKeys = priorKeys.slice(-AVERAGE_VOLUME_LOOKBACK_SESSIONS);
  const volumes = lookbackKeys.map((k) =>
    (sessions.get(k) ?? [])
      .slice(0, barsElapsed)
      .reduce((sum, b) => sum + b.volume, 0),
  );

  return { baseline: weightedMean(volumes), eligible: priorKeys.length };
}

async function main() {
  const ticker = process.argv[2];
  const replayDate = process.argv[3];

  if (!ticker || !replayDate) {
    console.error('Usage: npx ts-node scripts/sndk-breakout-replay.ts <TICKER> <YYYY-MM-DD>');
    process.exit(1);
  }

  const replayEnd = DateTime.fromISO(`${replayDate}T20:00:00`, { zone: MARKET_TZ }).toUTC().toJSDate();
  const lookbackStart = new Date(replayEnd.getTime() - INTRADAY_LOOKBACK_CALENDAR_DAYS * 24 * 60 * 60 * 1000);

  console.log(`\nFetching ${ticker} 5m bars from ${lookbackStart.toISOString().slice(0, 10)} to ${replayDate}...\n`);

  const yf = new YahooFinance();
  let rawBars: Bar[];
  try {
    const result = await yf.chart(ticker, {
      period1: lookbackStart,
      period2: replayEnd,
      interval: '5m',
      return: 'array',
    });

    rawBars = (result.quotes ?? [])
      .filter((q) => q.close != null && Number.isFinite(q.close) && q.open != null && q.high != null && q.low != null)
      .map((q) => ({
        date: new Date(q.date),
        open: q.open ?? q.close!,
        high: q.high ?? q.close!,
        low: q.low ?? q.close!,
        close: q.close!,
        volume: q.volume ?? 0,
      }))
      .filter((b) => isDuringMarketHours(b.date))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  } catch (e) {
    console.error(`Failed to fetch data: ${(e as Error).message}`);
    process.exit(1);
  }

  const sessions = new Map<string, Bar[]>();
  for (const bar of rawBars) {
    const key = getMarketDateKey(bar.date);
    const existing = sessions.get(key) ?? [];
    existing.push(bar);
    sessions.set(key, existing);
  }

  const orderedKeys = Array.from(sessions.keys()).sort();

  if (!sessions.has(replayDate)) {
    console.error(`No data found for ${replayDate}. Available sessions: ${orderedKeys.join(', ')}`);
    process.exit(1);
  }

  const sessionBars = sessions.get(replayDate)!;
  const priorSessionHigh = getPriorSessionHigh(replayDate, sessions, orderedKeys);

  console.log(`Sessions in lookback: ${orderedKeys.join(', ')}`);
  console.log(`${replayDate} — ${sessionBars.length} bars | Prior session high: ${priorSessionHigh?.toFixed(2) ?? 'N/A'}\n`);

  const header = ['Time(ET)', 'Close', 'EMA(9)', 'CumVol', 'Baseline', 'EMA↑', 'Vol≥Base', '>PrevHi', 'SIGNAL']
    .map((h, i) => h.padEnd([9, 9, 9, 12, 12, 7, 9, 8, 0][i]))
    .join('');
  console.log(header);
  console.log('-'.repeat(90));

  let detectedAt: string | null = null;

  for (let i = EMA_MINIMUM_BARS - 1; i < sessionBars.length; i++) {
    const visible = sessionBars.slice(0, i + 1);
    const latest = visible[i];
    const previous = visible[i - 1];

    const ema9Map = sessionEma9(visible);
    const ema9Latest = ema9Map.get(latest.date.getTime())!;
    const ema9Previous = ema9Map.get(previous.date.getTime())!;

    const ema9Rising = ema9Latest > ema9Previous;

    const { baseline, eligible } = computeBaseline(replayDate, visible, sessions, orderedKeys);
    const cumVol = visible.reduce((s, b) => s + b.volume, 0);
    const volumeSurge = eligible >= AVERAGE_VOLUME_LOOKBACK_SESSIONS && baseline > 0 && cumVol >= baseline;

    const abovePriorHigh = priorSessionHigh === undefined || latest.close > priorSessionHigh;

    const detected = ema9Rising && volumeSurge && abovePriorHigh;

    console.log([
      formatET(latest.date).padEnd(9),
      latest.close.toFixed(2).padEnd(9),
      ema9Latest.toFixed(2).padEnd(9),
      cumVol.toLocaleString().padEnd(12),
      baseline > 0 ? Math.round(baseline).toLocaleString().padEnd(12) : 'N/A'.padEnd(12),
      (ema9Rising ? '✓' : '✗').padEnd(7),
      (volumeSurge ? '✓' : '✗').padEnd(9),
      (abovePriorHigh ? '✓' : '✗').padEnd(8),
      detected ? '*** BREAKOUT ***' : '',
    ].join(''));

    if (detected && detectedAt === null) {
      detectedAt = formatET(latest.date);
    }
  }

  console.log('\n' + '-'.repeat(90));
  if (detectedAt) {
    console.log(`\nBreakout first detected at ${detectedAt} ET on ${replayDate}`);
  } else {
    console.log(`\nNo breakout detected on ${replayDate}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
