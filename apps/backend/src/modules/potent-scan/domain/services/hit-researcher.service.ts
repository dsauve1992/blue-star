import {
  HitHeadlines,
  HitResearch,
  ResearchSubject,
  ResearchUsage,
} from '../value-objects/hit-research';
import { SessionDate } from '../value-objects/session-date';

export interface HeadlineSource {
  fetch(symbols: string[]): Promise<HitHeadlines[]>;
}

export interface HitResearchBatchResult {
  research: HitResearch[];
  usage: ResearchUsage;
}

export class HitResearchBatchError extends Error {
  constructor(
    message: string,
    readonly usage: ResearchUsage,
    readonly research: HitResearch[],
  ) {
    super(message);
    this.name = 'HitResearchBatchError';
  }
}

export interface HitResearcher {
  research(
    sessionDate: SessionDate,
    subjects: ResearchSubject[],
  ): Promise<HitResearchBatchResult>;
}
