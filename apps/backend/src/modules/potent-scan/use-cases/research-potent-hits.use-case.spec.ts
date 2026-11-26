import { Test } from '@nestjs/testing';
import {
  RESEARCH_BATCH_SIZE,
  ResearchPotentHitsUseCase,
} from './research-potent-hits.use-case';
import {
  HEADLINE_SOURCE,
  HIT_RESEARCH_REPOSITORY,
  HIT_RESEARCHER,
  POTENT_SCAN_REPOSITORY,
} from '../constants/tokens';
import { PotentScan } from '../domain/entities/potent-scan';
import { SessionDate } from '../domain/value-objects/session-date';
import {
  HitHeadlines,
  HitResearch,
  ResearchSubject,
  ResearchUsage,
} from '../domain/value-objects/hit-research';
import {
  HeadlineSource,
  HitResearchBatchError,
  HitResearcher,
} from '../domain/services/hit-researcher.service';
import { HitResearchRepository } from '../domain/repositories/hit-research.repository.interface';
import { NotFoundError, StateError } from '../domain/domain-errors';
import { hit } from '../test/fixtures';

const SESSION = SessionDate.of('2026-11-25');
const STARTED = new Date('2026-11-25T22:00:00.000Z');

const usage = (costUsd: number): ResearchUsage => ({
  inputTokens: 1000,
  outputTokens: 200,
  webSearchRequests: 1,
  costUsd,
});

const researchFor = (symbol: string): HitResearch => ({
  symbol,
  business: `${symbol} makes chips`,
  catalystToday: 'Beat earnings',
  catalystType: 'earnings',
  source: `https://news.example.com/${symbol}`,
  model: 'claude-haiku-5-5',
});

class FakeResearcher implements HitResearcher {
  batches: ResearchSubject[][] = [];
  failOnBatch: number | null = null;
  skip = new Set<string>();

  research(_: SessionDate, subjects: ResearchSubject[]) {
    this.batches.push(subjects);
    if (this.failOnBatch === this.batches.length) {
      return Promise.reject(
        new HitResearchBatchError('Anthropic API overloaded', usage(0.002), [
          researchFor(subjects[0].symbol),
        ]),
      );
    }
    return Promise.resolve({
      research: subjects
        .filter((subject) => !this.skip.has(subject.symbol))
        .map((subject) => researchFor(subject.symbol)),
      usage: usage(0.01),
    });
  }
}

class FakeHeadlineSource implements HeadlineSource {
  failure: Error | null = null;

  fetch(symbols: string[]): Promise<HitHeadlines[]> {
    if (this.failure) return Promise.reject(this.failure);
    return Promise.resolve(
      symbols.map((symbol) =>
        symbol === 'ERR'
          ? { symbol, headlines: [], fetchError: 'Yahoo down' }
          : {
              symbol,
              headlines: [
                {
                  title: `${symbol} beats`,
                  publisher: 'Reuters',
                  url: `https://news.example.com/${symbol}`,
                  publishedAt: '2026-11-25T21:00:00Z',
                },
              ],
              fetchError: null,
            },
      ),
    );
  }
}

describe('ResearchPotentHitsUseCase', () => {
  let useCase: ResearchPotentHitsUseCase;
  let researcher: FakeResearcher;
  let headlineSource: FakeHeadlineSource;
  let scanRepository: { findBySessionDate: jest.Mock };
  let researchRepository: jest.Mocked<HitResearchRepository>;

  const scanWith = (symbols: string[]) =>
    PotentScan.of({
      sessionDate: SESSION,
      universeSize: 2400,
      hits: symbols.map((symbol) => hit(symbol)),
      nearMisses: [],
    });

  beforeEach(async () => {
    jest.useFakeTimers({ now: STARTED });
    researcher = new FakeResearcher();
    headlineSource = new FakeHeadlineSource();
    scanRepository = {
      findBySessionDate: jest.fn().mockResolvedValue(scanWith(['AAA', 'BBB'])),
    };
    researchRepository = {
      saveRun: jest.fn().mockResolvedValue(undefined),
      recordRun: jest.fn().mockResolvedValue(undefined),
      findByScanDate: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ResearchPotentHitsUseCase,
        { provide: POTENT_SCAN_REPOSITORY, useValue: scanRepository },
        { provide: HEADLINE_SOURCE, useValue: headlineSource },
        { provide: HIT_RESEARCHER, useValue: researcher },
        { provide: HIT_RESEARCH_REPOSITORY, useValue: researchRepository },
      ],
    }).compile();

    useCase = module.get(ResearchPotentHitsUseCase);
  });

  afterEach(() => jest.useRealTimers());

  it('should save every hit research and a succeeded run with summed usage', async () => {
    await useCase.execute({ sessionDate: SESSION });

    expect(researchRepository.saveRun).toHaveBeenNthCalledWith(
      1,
      [researchFor('AAA'), researchFor('BBB')],
      {
        scanDate: SESSION,
        status: 'succeeded',
        hitCount: 2,
        researchedCount: 2,
        missingSymbols: [],
        headlineFetchErrors: [],
        usage: usage(0.01),
        error: null,
        startedAt: STARTED,
        finishedAt: STARTED,
      },
    );
  });

  it('should pass each hit with its headlines, and a fetch error rather than an empty feed', async () => {
    scanRepository.findBySessionDate.mockResolvedValue(
      scanWith(['AAA', 'ERR']),
    );

    await useCase.execute({ sessionDate: SESSION });

    expect(researcher.batches).toEqual([
      [
        {
          symbol: 'AAA',
          exchange: 'NASDAQ',
          sector: 'Technology',
          industry: 'Semiconductors',
          changePct: 12.5,
          headlines: [
            {
              title: 'AAA beats',
              publisher: 'Reuters',
              url: 'https://news.example.com/AAA',
              publishedAt: '2026-11-25T21:00:00Z',
            },
          ],
          fetchError: null,
        },
        {
          symbol: 'ERR',
          exchange: 'NASDAQ',
          sector: 'Technology',
          industry: 'Semiconductors',
          changePct: 12.5,
          headlines: [],
          fetchError: 'Yahoo down',
        },
      ],
    ]);
  });

  it('should research the hits in batches of ten', async () => {
    const symbols = Array.from({ length: 23 }, (_, i) => `S${i}`);
    scanRepository.findBySessionDate.mockResolvedValue(scanWith(symbols));

    await useCase.execute({ sessionDate: SESSION });

    expect(RESEARCH_BATCH_SIZE).toBe(10);
    expect(researcher.batches.map((batch) => batch.length)).toEqual([
      10, 10, 3,
    ]);
  });

  it('should keep the valid research, record a failed run and fail when a hit has no research', async () => {
    researcher.skip.add('BBB');

    await expect(useCase.execute({ sessionDate: SESSION })).rejects.toThrow(
      new StateError(
        'Potent research for 2026-11-25 is incomplete: 1/2 hits researched, missing BBB',
      ),
    );

    expect(researchRepository.saveRun).toHaveBeenNthCalledWith(
      1,
      [researchFor('AAA')],
      {
        scanDate: SESSION,
        status: 'failed',
        hitCount: 2,
        researchedCount: 1,
        missingSymbols: ['BBB'],
        headlineFetchErrors: [],
        usage: usage(0.01),
        error: null,
        startedAt: STARTED,
        finishedAt: STARTED,
      },
    );
  });

  it('should keep the research and tokens paid for before a batch failure and report the error', async () => {
    const symbols = Array.from({ length: 12 }, (_, i) => `S${i}`);
    scanRepository.findBySessionDate.mockResolvedValue(scanWith(symbols));
    researcher.failOnBatch = 2;

    await expect(useCase.execute({ sessionDate: SESSION })).rejects.toThrow(
      'Anthropic API overloaded',
    );

    const [research, run] = researchRepository.saveRun.mock.calls[0];
    expect(research).toEqual(symbols.slice(0, 11).map(researchFor));
    expect(run.status).toBe('failed');
    expect(run.missingSymbols).toEqual(['S11']);
    expect(run.usage).toEqual({
      inputTokens: 2000,
      outputTokens: 400,
      webSearchRequests: 2,
      costUsd: 0.012,
    });
    expect(run.error).toBe('Anthropic API overloaded');
  });

  it('should record the headline fetch errors on the run', async () => {
    scanRepository.findBySessionDate.mockResolvedValue(
      scanWith(['AAA', 'ERR']),
    );

    await useCase.execute({ sessionDate: SESSION });

    expect(
      researchRepository.saveRun.mock.calls[0][1].headlineFetchErrors,
    ).toEqual(['ERR: Yahoo down']);
  });

  it('should record a failed run, keep the stored research and rethrow when the headline fetch fails', async () => {
    const failure = new Error('Headline fetch failed. Exit code: 1');
    headlineSource.failure = failure;

    await expect(useCase.execute({ sessionDate: SESSION })).rejects.toThrow(
      failure,
    );

    expect(researchRepository.saveRun).not.toHaveBeenCalled();
    expect(researchRepository.recordRun).toHaveBeenNthCalledWith(1, {
      scanDate: SESSION,
      status: 'failed',
      hitCount: 2,
      researchedCount: 0,
      missingSymbols: ['AAA', 'BBB'],
      headlineFetchErrors: [],
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        webSearchRequests: 0,
        costUsd: 0,
      },
      error: 'Headline fetch failed. Exit code: 1',
      startedAt: STARTED,
      finishedAt: STARTED,
    });
    expect(researcher.batches).toEqual([]);
  });

  it('should fail with not found when the scan does not exist', async () => {
    scanRepository.findBySessionDate.mockResolvedValue(null);

    await expect(useCase.execute({ sessionDate: SESSION })).rejects.toThrow(
      NotFoundError,
    );
    expect(researchRepository.saveRun).not.toHaveBeenCalled();
  });
});
