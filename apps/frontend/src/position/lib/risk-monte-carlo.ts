export type MonteCarloParams = {
  portfolio: number;
  riskPerTradeFraction: number;
  winRate: number;
  rewardToRisk: number;
  tradesPerYear: number;
  years: number;
  pathCount: number;
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(parts: (string | number)[]): number {
  const s = parts.join("|");
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function quantileNearest(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round(q * (sorted.length - 1))),
  );
  return sorted[idx];
}

export type MonteCarloResult = {
  p10: number[];
  p50: number[];
  p90: number[];
  pathCount: number;
};

export function runMonteCarloPlan(p: MonteCarloParams): MonteCarloResult {
  const { portfolio, riskPerTradeFraction, winRate, rewardToRisk, tradesPerYear, years, pathCount } = p;
  const seedBase = hashSeed([
    portfolio,
    riskPerTradeFraction,
    winRate,
    rewardToRisk,
    tradesPerYear,
    years,
    pathCount,
  ]);

  const buckets: number[][] = Array.from({ length: years + 1 }, () => []);

  for (let path = 0; path < pathCount; path++) {
    const rnd = mulberry32((seedBase + path * 1000003) >>> 0);
    let equity = portfolio;
    buckets[0].push(equity);

    for (let y = 0; y < years; y++) {
      for (let t = 0; t < tradesPerYear; t++) {
        const win = rnd() < winRate;
        if (win) {
          equity *= 1 + riskPerTradeFraction * rewardToRisk;
        } else {
          equity *= 1 - riskPerTradeFraction;
        }
        if (!Number.isFinite(equity) || equity < 0) equity = 0;
      }
      buckets[y + 1].push(equity);
    }
  }

  const p10: number[] = [];
  const p50: number[] = [];
  const p90: number[] = [];

  for (let y = 0; y <= years; y++) {
    const sorted = [...buckets[y]].sort((a, b) => a - b);
    p10.push(quantileNearest(sorted, 0.1));
    p50.push(quantileNearest(sorted, 0.5));
    p90.push(quantileNearest(sorted, 0.9));
  }

  return { p10, p50, p90, pathCount };
}

export function medianCagr(
  startEquity: number,
  endEquity: number,
  years: number,
): number | null {
  if (startEquity <= 0 || years <= 0) return null;
  if (endEquity <= 0) return -1;
  return Math.pow(endEquity / startEquity, 1 / years) - 1;
}
