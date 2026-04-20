import type {
  JournalEntry,
  JournalTrade,
} from "src/position/lib/risk-journal-demo";

export type DerivedJournalTrade = {
  id: string;
  symbol: string;
  openedAt: string;
  closedAt: string;
  holdDays: number;
  totalEntryQuantity: number;
  totalExitQuantity: number;
  averageEntryPrice: number;
  averageExitPrice: number;
  realizedPnl: number;
  plannedRiskCapital: number;
  realizedR: number;
  isWin: boolean;
  addCount: number;
  stopRaiseCount: number;
  partialExitCount: number;
  hasAdd: boolean;
  usedStopRaise: boolean;
  exceededPlannedRisk: boolean;
  initialStopPrice: number;
};

export type BookStats = {
  n: number;
  winRate: number;
  avgWinR: number | null;
  avgLossRAbs: number | null;
  rewardRisk: number | null;
  breakevenAtBookAvgR: number | null;
  expectancyRPerTrade: number | null;
  profitFactor: number | null;
  grossProfitR: number;
  grossLossRAbs: number;
  averageHoldDays: number | null;
  medianWinHoldDays: number | null;
  medianLossHoldDays: number | null;
  tradesWithAddsPct: number;
  tradesWithStopRaisePct: number;
  tradesWithPartialExitsPct: number;
  oversizedLossPct: number;
  smallWinnerPct: number;
  annualizedTradeCount: number;
  edgeScore: number;
  breakevenBufferPct: number | null;
  systemStatus: "Edge intact" | "Constructive" | "At risk" | "Broken";
  sampleStart: string | null;
  sampleEnd: string | null;
};

export type CoachingInsight = {
  title: string;
  body: string;
  tone: "positive" | "warning" | "neutral";
};

export type HoldBucket = {
  label: string;
  winners: number;
  losers: number;
};

export type JournalAnalytics = {
  book: BookStats;
  trades: DerivedJournalTrade[];
  insights: CoachingInsight[];
  holdBuckets: HoldBucket[];
  averageRWithAdds: number | null;
  averageRWithoutAdds: number | null;
  topWinners: DerivedJournalTrade[];
  topLosers: DerivedJournalTrade[];
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function toTime(timestamp: string): number {
  return new Date(timestamp).getTime();
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function percentage(count: number, total: number): number {
  return total === 0 ? 0 : (count / total) * 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sumEntryCost(entries: JournalEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.price * entry.quantity, 0);
}

function getActiveStopAt(trade: JournalTrade, timestamp: string): number {
  const ts = toTime(timestamp);
  let activeStop = trade.initialStopPrice;
  for (const adjustment of trade.stopAdjustments
    .filter((adjustment) => toTime(adjustment.timestamp) <= ts)
    .sort((left, right) => toTime(left.timestamp) - toTime(right.timestamp))) {
    activeStop = adjustment.stopPrice;
  }
  return activeStop;
}

function deriveTrade(trade: JournalTrade): DerivedJournalTrade {
  const sortedEntries = [...trade.entries].sort(
    (left, right) => toTime(left.timestamp) - toTime(right.timestamp),
  );
  const sortedExits = [...trade.exits].sort(
    (left, right) => toTime(left.timestamp) - toTime(right.timestamp),
  );

  const openedAt = sortedEntries[0]?.timestamp ?? trade.entries[0]?.timestamp;
  const closedAt =
    sortedExits[sortedExits.length - 1]?.timestamp ?? sortedEntries[0]?.timestamp;

  const totalEntryQuantity = sortedEntries.reduce(
    (sum, entry) => sum + entry.quantity,
    0,
  );
  const totalExitQuantity = sortedExits.reduce((sum, exit) => sum + exit.quantity, 0);
  const totalEntryCost = sumEntryCost(sortedEntries);
  const totalExitValue = sortedExits.reduce(
    (sum, exit) => sum + exit.price * exit.quantity,
    0,
  );
  const plannedRiskCapital = sortedEntries.reduce((sum, entry) => {
    const activeStop = getActiveStopAt(trade, entry.timestamp);
    return sum + entry.quantity * Math.max(entry.price - activeStop, 0.01);
  }, 0);

  const realizedPnl = totalExitValue - totalEntryCost;
  const realizedR =
    plannedRiskCapital <= 0 ? 0 : round(realizedPnl / plannedRiskCapital, 2);
  const averageEntryPrice =
    totalEntryQuantity === 0 ? 0 : totalEntryCost / totalEntryQuantity;
  const averageExitPrice =
    totalExitQuantity === 0 ? 0 : totalExitValue / totalExitQuantity;

  const stopLevels = [trade.initialStopPrice, ...trade.stopAdjustments.map((item) => item.stopPrice)];
  const stopRaiseCount = stopLevels.slice(1).reduce((count, stopPrice, index) => {
    return count + (stopPrice > stopLevels[index] ? 1 : 0);
  }, 0);

  const holdDays = Math.max(
    1,
    Math.ceil((toTime(closedAt) - toTime(openedAt)) / MS_PER_DAY),
  );

  return {
    id: trade.id,
    symbol: trade.symbol,
    openedAt,
    closedAt,
    holdDays,
    totalEntryQuantity,
    totalExitQuantity,
    averageEntryPrice: round(averageEntryPrice, 2),
    averageExitPrice: round(averageExitPrice, 2),
    realizedPnl: round(realizedPnl, 2),
    plannedRiskCapital: round(plannedRiskCapital, 2),
    realizedR,
    isWin: realizedPnl > 0,
    addCount: Math.max(0, sortedEntries.length - 1),
    stopRaiseCount,
    partialExitCount: Math.max(0, sortedExits.length - 1),
    hasAdd: sortedEntries.length > 1,
    usedStopRaise: stopRaiseCount > 0,
    exceededPlannedRisk: realizedR < -1.05,
    initialStopPrice: trade.initialStopPrice,
  };
}

function createHoldBuckets(trades: DerivedJournalTrade[]): HoldBucket[] {
  const buckets: HoldBucket[] = [
    { label: "1–5d", winners: 0, losers: 0 },
    { label: "6–10d", winners: 0, losers: 0 },
    { label: "11–20d", winners: 0, losers: 0 },
    { label: "21d+", winners: 0, losers: 0 },
  ];

  for (const trade of trades) {
    const bucket =
      trade.holdDays <= 5
        ? buckets[0]
        : trade.holdDays <= 10
          ? buckets[1]
          : trade.holdDays <= 20
            ? buckets[2]
            : buckets[3];

    if (trade.isWin) bucket.winners += 1;
    else bucket.losers += 1;
  }

  return buckets;
}

function createInsights(
  book: BookStats,
  trades: DerivedJournalTrade[],
  averageRWithAdds: number | null,
  averageRWithoutAdds: number | null,
): CoachingInsight[] {
  const insights: CoachingInsight[] = [];

  if (
    book.expectancyRPerTrade != null &&
    book.expectancyRPerTrade > 0 &&
    book.breakevenBufferPct != null &&
    book.breakevenBufferPct > 0
  ) {
    insights.push({
      title: "Edge is currently positive",
      body: `Win rate sits ${book.breakevenBufferPct.toFixed(1)} points above breakeven, keeping expectancy at ${book.expectancyRPerTrade.toFixed(2)}R per trade.`,
      tone: "positive",
    });
  }

  if (book.oversizedLossPct > 0) {
    insights.push({
      title: "Loss control is the biggest drag",
      body: `${book.oversizedLossPct.toFixed(0)}% of losers exceeded planned risk. Gap-down or late exits are leaking more than the strategy can afford.`,
      tone: "warning",
    });
  }

  if (
    averageRWithAdds != null &&
    averageRWithoutAdds != null &&
    averageRWithAdds > averageRWithoutAdds + 0.25
  ) {
    insights.push({
      title: "Adds are helping your best swings",
      body: `Trades with add-ons are averaging ${averageRWithAdds.toFixed(2)}R versus ${averageRWithoutAdds.toFixed(2)}R without adds.`,
      tone: "positive",
    });
  } else if (
    averageRWithAdds != null &&
    averageRWithoutAdds != null &&
    averageRWithAdds + 0.2 < averageRWithoutAdds
  ) {
    insights.push({
      title: "Adds are not yet improving outcomes",
      body: `Pyramided trades are averaging ${averageRWithAdds.toFixed(2)}R versus ${averageRWithoutAdds.toFixed(2)}R for single-entry swings.`,
      tone: "warning",
    });
  }

  if (
    book.medianWinHoldDays != null &&
    book.medianLossHoldDays != null &&
    book.medianWinHoldDays <= book.medianLossHoldDays
  ) {
    insights.push({
      title: "Winners may not be getting enough time",
      body: `Median winner hold time is ${book.medianWinHoldDays.toFixed(0)} days versus ${book.medianLossHoldDays.toFixed(0)} days for losers.`,
      tone: "neutral",
    });
  }

  if (book.smallWinnerPct >= 35) {
    insights.push({
      title: "Too many winners are being monetized too early",
      body: `${book.smallWinnerPct.toFixed(0)}% of winning trades finished under 1R. For a swing system, the right tail should work harder.`,
      tone: "warning",
    });
  }

  if (book.tradesWithStopRaisePct < 40) {
    insights.push({
      title: "Trailing discipline could be tighter",
      body: `Only ${book.tradesWithStopRaisePct.toFixed(0)}% of trades show stop raises. More disciplined stop progression could protect open profits earlier.`,
      tone: "neutral",
    });
  }

  if (insights.length < 4) {
    const bestTrade = [...trades].sort((left, right) => right.realizedR - left.realizedR)[0];
    if (bestTrade) {
      insights.push({
        title: "Your best trade so far",
        body: `${bestTrade.symbol} produced ${bestTrade.realizedR.toFixed(2)}R over ${bestTrade.holdDays} days — the right tail this system needs more of.`,
        tone: "positive",
      });
    }
  }

  return insights.slice(0, 5);
}

export function analyzeJournalTrades(trades: JournalTrade[]): JournalAnalytics {
  const derivedTrades = trades
    .map(deriveTrade)
    .sort((left, right) => toTime(left.closedAt) - toTime(right.closedAt));

  const wins = derivedTrades.filter((trade) => trade.isWin);
  const losses = derivedTrades.filter((trade) => !trade.isWin);
  const winningRs = wins.map((trade) => trade.realizedR);
  const losingRsAbs = losses.map((trade) => Math.abs(trade.realizedR));
  const expectancy = average(derivedTrades.map((trade) => trade.realizedR));
  const avgWinR = average(winningRs);
  const avgLossRAbs = average(losingRsAbs);
  const rewardRisk =
    avgWinR == null || avgLossRAbs == null || avgLossRAbs === 0
      ? null
      : avgWinR / avgLossRAbs;
  const breakeven =
    avgWinR == null || avgLossRAbs == null
      ? null
      : avgLossRAbs / (avgWinR + avgLossRAbs);
  const grossProfitR = round(
    wins.reduce((sum, trade) => sum + trade.realizedR, 0),
  );
  const grossLossRAbs = round(
    losses.reduce((sum, trade) => sum + Math.abs(trade.realizedR), 0),
  );
  const profitFactor =
    grossLossRAbs === 0 ? null : round(grossProfitR / grossLossRAbs, 2);

  const sampleStart = derivedTrades[0]?.openedAt ?? null;
  const sampleEnd = derivedTrades[derivedTrades.length - 1]?.closedAt ?? null;
  const sampleSpanDays =
    sampleStart == null || sampleEnd == null
      ? 1
      : Math.max(1, Math.ceil((toTime(sampleEnd) - toTime(sampleStart)) / MS_PER_DAY));
  const annualizedTradeCount = Math.max(
    12,
    Math.round((derivedTrades.length / sampleSpanDays) * 365),
  );

  const breakevenBufferPct =
    breakeven == null
      ? null
      : percentage(wins.length, derivedTrades.length) - breakeven * 100;
  const averageHoldDays = average(derivedTrades.map((trade) => trade.holdDays));
  const medianWinHoldDays = median(wins.map((trade) => trade.holdDays));
  const medianLossHoldDays = median(losses.map((trade) => trade.holdDays));
  const tradesWithAddsPct = percentage(
    derivedTrades.filter((trade) => trade.hasAdd).length,
    derivedTrades.length,
  );
  const tradesWithStopRaisePct = percentage(
    derivedTrades.filter((trade) => trade.usedStopRaise).length,
    derivedTrades.length,
  );
  const tradesWithPartialExitsPct = percentage(
    derivedTrades.filter((trade) => trade.partialExitCount > 0).length,
    derivedTrades.length,
  );
  const oversizedLossPct = percentage(
    losses.filter((trade) => trade.exceededPlannedRisk).length,
    losses.length,
  );
  const smallWinnerPct = percentage(
    wins.filter((trade) => trade.realizedR < 1).length,
    wins.length,
  );

  const averageRWithAdds = average(
    derivedTrades.filter((trade) => trade.hasAdd).map((trade) => trade.realizedR),
  );
  const averageRWithoutAdds = average(
    derivedTrades.filter((trade) => !trade.hasAdd).map((trade) => trade.realizedR),
  );

  const expectancyForScore = expectancy ?? 0;
  const profitFactorForScore = profitFactor ?? 0;
  const breakevenBufferForScore = breakevenBufferPct ?? 0;
  const sampleScore = Math.min(12, Math.sqrt(derivedTrades.length) * 3);
  const edgeScore = round(
    clamp(
      50 +
        expectancyForScore * 18 +
        (profitFactorForScore - 1) * 14 +
        breakevenBufferForScore * 1.4 -
        oversizedLossPct * 0.4 +
        sampleScore,
      0,
      100,
    ),
    0,
  );

  const systemStatus: BookStats["systemStatus"] =
    expectancyForScore <= 0
      ? "Broken"
      : oversizedLossPct >= 40 || (breakevenBufferPct ?? 0) < 2
        ? "At risk"
        : edgeScore >= 78
          ? "Edge intact"
          : "Constructive";

  const book: BookStats = {
    n: derivedTrades.length,
    winRate: derivedTrades.length === 0 ? 0 : wins.length / derivedTrades.length,
    avgWinR: avgWinR == null ? null : round(avgWinR, 2),
    avgLossRAbs: avgLossRAbs == null ? null : round(avgLossRAbs, 2),
    rewardRisk: rewardRisk == null ? null : round(rewardRisk, 2),
    breakevenAtBookAvgR: breakeven == null ? null : round(breakeven, 4),
    expectancyRPerTrade: expectancy == null ? null : round(expectancy, 2),
    profitFactor,
    grossProfitR,
    grossLossRAbs,
    averageHoldDays: averageHoldDays == null ? null : round(averageHoldDays, 1),
    medianWinHoldDays: medianWinHoldDays == null ? null : round(medianWinHoldDays, 1),
    medianLossHoldDays:
      medianLossHoldDays == null ? null : round(medianLossHoldDays, 1),
    tradesWithAddsPct: round(tradesWithAddsPct, 1),
    tradesWithStopRaisePct: round(tradesWithStopRaisePct, 1),
    tradesWithPartialExitsPct: round(tradesWithPartialExitsPct, 1),
    oversizedLossPct: round(oversizedLossPct, 1),
    smallWinnerPct: round(smallWinnerPct, 1),
    annualizedTradeCount,
    edgeScore,
    breakevenBufferPct:
      breakevenBufferPct == null ? null : round(breakevenBufferPct, 1),
    systemStatus,
    sampleStart,
    sampleEnd,
  };

  return {
    book,
    trades: derivedTrades,
    insights: createInsights(book, derivedTrades, averageRWithAdds, averageRWithoutAdds),
    holdBuckets: createHoldBuckets(derivedTrades),
    averageRWithAdds:
      averageRWithAdds == null ? null : round(averageRWithAdds, 2),
    averageRWithoutAdds:
      averageRWithoutAdds == null ? null : round(averageRWithoutAdds, 2),
    topWinners: [...derivedTrades]
      .sort((left, right) => right.realizedR - left.realizedR)
      .slice(0, 3),
    topLosers: [...derivedTrades]
      .sort((left, right) => left.realizedR - right.realizedR)
      .slice(0, 3),
  };
}
