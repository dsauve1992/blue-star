import { EMACalculator } from '../../../../shared/utils/ema-calculator';
import { classifyTier, MemberTier } from '../value-objects/member-tier';
import { SessionDate } from '../value-objects/session-date';
import { DailyBar } from './daily-bar-provider.service';

const ADR_PERIOD = 14;

export function computeMemberTiers(
  memberId: string,
  bars: DailyBar[],
  from: SessionDate,
  to: SessionDate,
): MemberTier[] {
  const indexes = bars.map((_, index) => index);
  const closes = new Map(bars.map((bar, index) => [index, bar.close]));
  const [ema9, ema21, ema50] = [9, 21, 50].map((period) =>
    EMACalculator.calculate(closes, indexes, period),
  );

  return bars.flatMap((bar, index): MemberTier[] => {
    if (bar.date.value < from.value || bar.date.value > to.value) return [];
    const [fast, medium, slow] = [ema9, ema21, ema50].map(
      (ema) => ema.get(index)!,
    );
    return [
      {
        memberId,
        date: bar.date,
        tier: classifyTier(fast, medium, slow),
        close: bar.close,
        ema9: fast,
        ema21: medium,
        ema50: slow,
        adrPct: adrPct(bars, index),
      },
    ];
  });
}

function adrPct(bars: DailyBar[], index: number): number | null {
  if (index + 1 < ADR_PERIOD) return null;
  const window = bars.slice(index + 1 - ADR_PERIOD, index + 1);
  const meanRange =
    window.reduce((sum, bar) => sum + bar.high - bar.low, 0) / ADR_PERIOD;
  return (meanRange / bars[index].close) * 100;
}
