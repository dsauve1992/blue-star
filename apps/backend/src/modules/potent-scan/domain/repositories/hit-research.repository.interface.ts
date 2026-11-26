import { SessionDate } from '../value-objects/session-date';
import { HitResearch, ResearchRun } from '../value-objects/hit-research';

export interface HitResearchRepository {
  saveRun(research: HitResearch[], run: ResearchRun): Promise<void>;
  recordRun(run: ResearchRun): Promise<void>;
  findByScanDate(scanDate: SessionDate): Promise<HitResearch[]>;
}
