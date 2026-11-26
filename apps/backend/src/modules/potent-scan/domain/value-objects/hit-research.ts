import { SessionDate } from './session-date';

export const CATALYST_TYPES = [
  'earnings',
  'guidance',
  'sector',
  'upgrade',
  'm&a',
  'none',
  'other',
] as const;

export type CatalystType = (typeof CATALYST_TYPES)[number];

export interface Headline {
  title: string;
  publisher: string | null;
  url: string;
  publishedAt: string | null;
}

export interface HitHeadlines {
  symbol: string;
  headlines: Headline[];
  fetchError: string | null;
}

export interface ResearchSubject extends HitHeadlines {
  exchange: string;
  sector: string;
  industry: string;
  changePct: number;
}

export interface HitResearch {
  symbol: string;
  business: string;
  catalystToday: string;
  catalystType: CatalystType;
  source: string | null;
  model: string;
}

export interface ResearchUsage {
  inputTokens: number;
  outputTokens: number;
  webSearchRequests: number;
  costUsd: number;
}

export const NO_USAGE: ResearchUsage = {
  inputTokens: 0,
  outputTokens: 0,
  webSearchRequests: 0,
  costUsd: 0,
};

export function addUsage(a: ResearchUsage, b: ResearchUsage): ResearchUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    webSearchRequests: a.webSearchRequests + b.webSearchRequests,
    costUsd: a.costUsd + b.costUsd,
  };
}

export interface ResearchRun {
  scanDate: SessionDate;
  status: 'succeeded' | 'failed';
  hitCount: number;
  researchedCount: number;
  missingSymbols: string[];
  headlineFetchErrors: string[];
  usage: ResearchUsage;
  error: string | null;
  startedAt: Date;
  finishedAt: Date;
}
