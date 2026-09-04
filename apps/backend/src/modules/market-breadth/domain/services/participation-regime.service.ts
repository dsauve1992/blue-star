export type ParticipationRegime = 'GREEN' | 'YELLOW' | 'RED';

export const PARTICIPATION_LOOKBACK_SESSIONS = 5;
export const PARTICIPATION_GREEN_THRESHOLD = 0.6;
export const PARTICIPATION_RED_THRESHOLD = 0.4;

export interface ParticipationGauge {
  averageRatio: number;
  regime: ParticipationRegime;
  sampleSize: number;
}

export function gaugeParticipation(
  ratiosOldestToNewest: Array<number | null>,
  lookback: number = PARTICIPATION_LOOKBACK_SESSIONS,
): ParticipationGauge | null {
  const window = ratiosOldestToNewest
    .filter((ratio): ratio is number => ratio !== null)
    .slice(-lookback);

  if (window.length === 0) {
    return null;
  }

  const averageRatio =
    window.reduce((sum, ratio) => sum + ratio, 0) / window.length;

  return {
    averageRatio,
    regime: classifyRatio(averageRatio),
    sampleSize: window.length,
  };
}

export function trailingAverageRatios(
  ratiosOldestToNewest: Array<number | null>,
  lookback: number = PARTICIPATION_LOOKBACK_SESSIONS,
): Array<number | null> {
  return ratiosOldestToNewest.map((_, index) => {
    const gauge = gaugeParticipation(
      ratiosOldestToNewest.slice(0, index + 1),
      lookback,
    );
    return gauge?.averageRatio ?? null;
  });
}

function classifyRatio(averageRatio: number): ParticipationRegime {
  if (averageRatio >= PARTICIPATION_GREEN_THRESHOLD) return 'GREEN';
  if (averageRatio < PARTICIPATION_RED_THRESHOLD) return 'RED';
  return 'YELLOW';
}
