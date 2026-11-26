import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  HEADLINE_SOURCE,
  HIT_RESEARCH_REPOSITORY,
  HIT_RESEARCHER,
  POTENT_SCAN_REPOSITORY,
} from '../constants/tokens';
import type { PotentScanRepository } from '../domain/repositories/potent-scan.repository.interface';
import type { HitResearchRepository } from '../domain/repositories/hit-research.repository.interface';
import {
  HitResearchBatchError,
  type HeadlineSource,
  type HitResearcher,
} from '../domain/services/hit-researcher.service';
import {
  addUsage,
  HitHeadlines,
  HitResearch,
  NO_USAGE,
  ResearchSubject,
  ResearchUsage,
} from '../domain/value-objects/hit-research';
import { SessionDate } from '../domain/value-objects/session-date';
import { NotFoundError, StateError } from '../domain/domain-errors';

export const RESEARCH_BATCH_SIZE = 10;

export interface ResearchPotentHitsRequestDto {
  sessionDate: SessionDate;
}

export interface ResearchPotentHitsResponseDto {
  sessionDate: SessionDate;
  researchedCount: number;
  usage: ResearchUsage;
}

@Injectable()
export class ResearchPotentHitsUseCase {
  private readonly logger = new Logger(ResearchPotentHitsUseCase.name);

  constructor(
    @Inject(POTENT_SCAN_REPOSITORY)
    private readonly scanRepository: PotentScanRepository,
    @Inject(HEADLINE_SOURCE)
    private readonly headlineSource: HeadlineSource,
    @Inject(HIT_RESEARCHER)
    private readonly researcher: HitResearcher,
    @Inject(HIT_RESEARCH_REPOSITORY)
    private readonly researchRepository: HitResearchRepository,
  ) {}

  async execute(
    request: ResearchPotentHitsRequestDto,
  ): Promise<ResearchPotentHitsResponseDto> {
    const scan = await this.scanRepository.findBySessionDate(
      request.sessionDate,
    );
    if (!scan) {
      throw new NotFoundError(
        `No potent scan for ${request.sessionDate.value}`,
      );
    }

    const startedAt = new Date();
    const symbols = scan.hits.map((hit) => hit.symbol);
    let headlines: HitHeadlines[];
    try {
      headlines = await this.headlineSource.fetch(symbols);
    } catch (fetchError: unknown) {
      await this.researchRepository.recordRun({
        scanDate: scan.sessionDate,
        status: 'failed',
        hitCount: symbols.length,
        researchedCount: 0,
        missingSymbols: symbols,
        headlineFetchErrors: [],
        usage: NO_USAGE,
        error: fetchError instanceof Error ? fetchError.message : 'Unknown',
        startedAt,
        finishedAt: new Date(),
      });
      throw fetchError;
    }
    const headlinesBySymbol = new Map(headlines.map((h) => [h.symbol, h]));
    const subjects: ResearchSubject[] = scan.hits.map((hit) => ({
      symbol: hit.symbol,
      exchange: hit.exchange,
      sector: hit.sector,
      industry: hit.industry,
      changePct: hit.changePct,
      headlines: headlinesBySymbol.get(hit.symbol)?.headlines ?? [],
      fetchError:
        headlinesBySymbol.get(hit.symbol)?.fetchError ??
        (headlinesBySymbol.has(hit.symbol) ? null : 'No headline result'),
    }));

    const research: HitResearch[] = [];
    let usage = NO_USAGE;
    let error: string | null = null;

    for (let i = 0; i < subjects.length; i += RESEARCH_BATCH_SIZE) {
      const batch = subjects.slice(i, i + RESEARCH_BATCH_SIZE);
      try {
        const result = await this.researcher.research(scan.sessionDate, batch);
        research.push(...result.research);
        usage = addUsage(usage, result.usage);
      } catch (batchError: unknown) {
        if (batchError instanceof HitResearchBatchError) {
          usage = addUsage(usage, batchError.usage);
          research.push(...batchError.research);
        }
        error = batchError instanceof Error ? batchError.message : 'Unknown';
        break;
      }
    }

    const researched = new Set(research.map((item) => item.symbol));
    const missingSymbols = subjects
      .map((subject) => subject.symbol)
      .filter((symbol) => !researched.has(symbol));
    const succeeded = error === null && missingSymbols.length === 0;

    await this.researchRepository.saveRun(research, {
      scanDate: scan.sessionDate,
      status: succeeded ? 'succeeded' : 'failed',
      hitCount: subjects.length,
      researchedCount: research.length,
      missingSymbols,
      headlineFetchErrors: subjects
        .filter((subject) => subject.fetchError !== null)
        .map((subject) => `${subject.symbol}: ${subject.fetchError}`),
      usage,
      error,
      startedAt,
      finishedAt: new Date(),
    });

    this.logger.log(
      `Potent research ${scan.sessionDate.value}: ${research.length}/${subjects.length} hits, ` +
        `${usage.inputTokens} in / ${usage.outputTokens} out tokens, ` +
        `${usage.webSearchRequests} searches, $${usage.costUsd.toFixed(4)}`,
    );

    if (!succeeded) {
      throw new StateError(
        `Potent research for ${scan.sessionDate.value} is incomplete: ` +
          `${research.length}/${subjects.length} hits researched` +
          (missingSymbols.length
            ? `, missing ${missingSymbols.join(', ')}`
            : '') +
          (error ? `. ${error}` : ''),
      );
    }

    return {
      sessionDate: scan.sessionDate,
      researchedCount: research.length,
      usage,
    };
  }
}
