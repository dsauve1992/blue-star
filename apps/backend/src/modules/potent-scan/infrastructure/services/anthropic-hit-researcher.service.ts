import Anthropic from '@anthropic-ai/sdk';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ANTHROPIC_MESSAGES } from '../../constants/tokens';
import {
  HitResearchBatchError,
  HitResearchBatchResult,
  HitResearcher,
} from '../../domain/services/hit-researcher.service';
import {
  addUsage,
  CATALYST_TYPES,
  CatalystType,
  HitResearch,
  NO_USAGE,
  ResearchSubject,
  ResearchUsage,
} from '../../domain/value-objects/hit-research';
import { SessionDate } from '../../domain/value-objects/session-date';
import type { AnthropicMessages } from './anthropic-messages.client';

interface ModelPricing {
  model: string;
  inputUsdPerMTok: number;
  outputUsdPerMTok: number;
  longPrompt?: {
    aboveInputTokens: number;
    inputUsdPerMTok: number;
    outputUsdPerMTok: number;
  };
}

export const CLAUDE_HAIKU_5_5: ModelPricing = {
  model: 'claude-haiku-5-5',
  inputUsdPerMTok: 0.1,
  outputUsdPerMTok: 0.5,
  longPrompt: {
    aboveInputTokens: 100_000,
    inputUsdPerMTok: 0.5,
    outputUsdPerMTok: 2.5,
  },
};

export const CLAUDE_SONNET_5_5: ModelPricing = {
  model: 'claude-sonnet-5-5',
  inputUsdPerMTok: 2,
  outputUsdPerMTok: 10,
};

export const HEADLINE_RESEARCH_MODEL = CLAUDE_HAIKU_5_5;
export const UNEXPLAINED_HIT_RESEARCH_MODEL = CLAUDE_HAIKU_5_5;

export const WEB_SEARCH_USD_PER_REQUEST = 0.01;
export const MAX_PROMPT_TOKENS = 90_000;
export const WEB_SEARCH_BATCH_SIZE = 3;
export const WEB_SEARCHES_PER_HIT = 2;
const MAX_PAUSE_CONTINUATIONS = 5;
const MAX_OUTPUT_TOKENS = 16000;

const SYSTEM_PROMPT = `You research US stocks that were among the biggest gainers of a trading session.
For each ticker, state in one or two sentences what the company does, and in one or two sentences why the stock moved on the session date.
Classify the catalyst as one of: earnings, guidance, sector (a sector or theme-wide move), upgrade (analyst action), m&a, other, or none (no identifiable news).
Every catalyst other than none needs a source: the URL of the headline or search result that reports it, copied exactly. Never invent a URL.
Answer for every ticker you are given and no other ticker.`;

const HEADLINE_INSTRUCTIONS = `Use only the headlines provided. If no headline explains the session's move, set catalystType to "none" and source to null; those tickers are researched again with web search.`;

const WEB_SEARCH_INSTRUCTIONS = `The provided headlines (if any) do not explain these moves. Use web search to find why each stock moved on the session date.
After searching, reply with only a JSON object of the form {"results": [{"ticker", "business", "catalystToday", "catalystType", "source"}]}, with no other text.`;

const RESULT_ITEM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['ticker', 'business', 'catalystToday', 'catalystType', 'source'],
  properties: {
    ticker: { type: 'string' },
    business: { type: 'string' },
    catalystToday: { type: 'string' },
    catalystType: { type: 'string', enum: [...CATALYST_TYPES] },
    source: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  },
};

const RESULTS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['results'],
  properties: { results: { type: 'array', items: RESULT_ITEM_SCHEMA } },
};

export function estimatePromptTokens(text: string): number {
  return Math.ceil(text.length / 3);
}

export function costOf(
  pricing: ModelPricing,
  inputTokens: number,
  outputTokens: number,
  webSearchRequests: number,
): number {
  const rates =
    pricing.longPrompt && inputTokens > pricing.longPrompt.aboveInputTokens
      ? pricing.longPrompt
      : pricing;
  return (
    (inputTokens * rates.inputUsdPerMTok +
      outputTokens * rates.outputUsdPerMTok) /
      1_000_000 +
    webSearchRequests * WEB_SEARCH_USD_PER_REQUEST
  );
}

function usageOf(pricing: ModelPricing, message: Anthropic.Message) {
  const usage = message.usage;
  const inputTokens =
    usage.input_tokens +
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0);
  const webSearchRequests = usage.server_tool_use?.web_search_requests ?? 0;
  return {
    inputTokens,
    outputTokens: usage.output_tokens,
    webSearchRequests,
    costUsd: costOf(
      pricing,
      inputTokens,
      usage.output_tokens,
      webSearchRequests,
    ),
  };
}

interface Rejection {
  ticker: string;
  reason: string;
}

export function validateResults(
  raw: unknown,
  subjects: ResearchSubject[],
  allowedSources: (symbol: string) => Set<string>,
  model: string,
): { accepted: HitResearch[]; rejected: Rejection[] } {
  const accepted: HitResearch[] = [];
  const rejected: Rejection[] = [];
  const expected = new Set(subjects.map((subject) => subject.symbol));
  const items =
    raw !== null &&
    typeof raw === 'object' &&
    'results' in raw &&
    Array.isArray(raw.results)
      ? (raw.results as unknown[])
      : [];

  for (const item of items) {
    const candidate = (item ?? {}) as Record<string, unknown>;
    const ticker = typeof candidate.ticker === 'string' ? candidate.ticker : '';
    const reject = (reason: string) => rejected.push({ ticker, reason });

    if (!expected.has(ticker)) {
      reject('unknown ticker');
      continue;
    }
    if (accepted.some((research) => research.symbol === ticker)) {
      reject('duplicate ticker');
      continue;
    }
    if (
      typeof candidate.business !== 'string' ||
      !candidate.business.trim() ||
      typeof candidate.catalystToday !== 'string' ||
      !candidate.catalystToday.trim()
    ) {
      reject('missing business or catalyst');
      continue;
    }
    if (!CATALYST_TYPES.includes(candidate.catalystType as CatalystType)) {
      reject(`invalid catalystType ${String(candidate.catalystType)}`);
      continue;
    }
    const catalystType = candidate.catalystType as CatalystType;
    const source =
      typeof candidate.source === 'string' && candidate.source.trim()
        ? candidate.source.trim()
        : null;
    if (source === null && catalystType !== 'none') {
      reject('catalyst without source');
      continue;
    }
    if (source !== null && !allowedSources(ticker).has(source)) {
      reject(`source not from headlines or search: ${source}`);
      continue;
    }
    accepted.push({
      symbol: ticker,
      business: candidate.business.trim(),
      catalystToday: candidate.catalystToday.trim(),
      catalystType,
      source,
      model,
    });
  }

  return { accepted, rejected };
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

export function extractResultsJson(text: string): unknown {
  const from = [...text.matchAll(/\{\s*"results"/g)].at(-1)?.index ?? -1;
  const end = text.lastIndexOf('}');
  if (from < 0 || end < from) return null;
  try {
    return JSON.parse(text.slice(from, end + 1));
  } catch {
    return null;
  }
}

function searchResults(message: Anthropic.Message) {
  const blocks = message.content.filter(
    (block): block is Anthropic.WebSearchToolResultBlock =>
      block.type === 'web_search_tool_result',
  );
  return {
    urls: blocks.flatMap((block) =>
      Array.isArray(block.content) ? block.content.map((r) => r.url) : [],
    ),
    succeeded: blocks.filter((block) => Array.isArray(block.content)).length,
  };
}

function subjectPayload(sessionDate: SessionDate, subjects: ResearchSubject[]) {
  return JSON.stringify({
    sessionDate: sessionDate.value,
    tickers: subjects.map((subject) => ({
      ticker: subject.symbol,
      exchange: subject.exchange,
      sector: subject.sector,
      industry: subject.industry,
      changePct: subject.changePct,
      headlines: subject.headlines.map((headline) => ({
        title: headline.title,
        publisher: headline.publisher,
        publishedAt: headline.publishedAt,
        url: headline.url,
      })),
    })),
  });
}

interface Tracker {
  usage: ResearchUsage;
  research: HitResearch[];
}

@Injectable()
export class AnthropicHitResearcher implements HitResearcher {
  private readonly logger = new Logger(AnthropicHitResearcher.name);

  constructor(
    @Inject(ANTHROPIC_MESSAGES)
    private readonly messages: AnthropicMessages,
  ) {}

  async research(
    sessionDate: SessionDate,
    subjects: ResearchSubject[],
  ): Promise<HitResearchBatchResult> {
    const tracker: Tracker = { usage: NO_USAGE, research: [] };
    try {
      await this.inPromptBudget(
        sessionDate,
        subjects.filter((s) => s.headlines.length > 0),
        HEADLINE_INSTRUCTIONS,
        (batch, prompt) => this.researchFromHeadlines(batch, prompt, tracker),
      );

      const explained = new Set(tracker.research.map((r) => r.symbol));
      const unexplained = subjects.filter((s) => !explained.has(s.symbol));
      for (let i = 0; i < unexplained.length; i += WEB_SEARCH_BATCH_SIZE) {
        await this.inPromptBudget(
          sessionDate,
          unexplained.slice(i, i + WEB_SEARCH_BATCH_SIZE),
          WEB_SEARCH_INSTRUCTIONS,
          (batch, prompt) => this.researchWithWebSearch(batch, prompt, tracker),
        );
      }

      return { research: tracker.research, usage: tracker.usage };
    } catch (error: unknown) {
      throw new HitResearchBatchError(
        error instanceof Error ? error.message : 'Unknown research error',
        tracker.usage,
        tracker.research,
      );
    }
  }

  private async inPromptBudget(
    sessionDate: SessionDate,
    subjects: ResearchSubject[],
    instructions: string,
    run: (subjects: ResearchSubject[], prompt: string) => Promise<void>,
  ): Promise<void> {
    if (subjects.length === 0) return;
    const prompt = `${instructions}\n\n${subjectPayload(sessionDate, subjects)}`;
    if (estimatePromptTokens(SYSTEM_PROMPT + prompt) <= MAX_PROMPT_TOKENS) {
      return run(subjects, prompt);
    }
    if (subjects.length === 1) {
      throw new Error(
        `Prompt for ${subjects[0].symbol} exceeds ${MAX_PROMPT_TOKENS} tokens`,
      );
    }
    const half = Math.ceil(subjects.length / 2);
    await this.inPromptBudget(
      sessionDate,
      subjects.slice(0, half),
      instructions,
      run,
    );
    await this.inPromptBudget(
      sessionDate,
      subjects.slice(half),
      instructions,
      run,
    );
  }

  private async researchFromHeadlines(
    subjects: ResearchSubject[],
    prompt: string,
    tracker: Tracker,
  ): Promise<void> {
    const message = await this.messages.create({
      model: HEADLINE_RESEARCH_MODEL.model,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: RESULTS_SCHEMA },
      },
    });
    tracker.usage = addUsage(
      tracker.usage,
      usageOf(HEADLINE_RESEARCH_MODEL, message),
    );
    if (message.stop_reason !== 'end_turn') {
      this.logStop('Headline research', message, subjects);
      return;
    }

    const headlineUrls = new Map(
      subjects.map((s) => [s.symbol, new Set(s.headlines.map((h) => h.url))]),
    );
    const { accepted, rejected } = validateResults(
      extractResultsJson(textOf(message)),
      subjects,
      (symbol) => headlineUrls.get(symbol) ?? new Set(),
      HEADLINE_RESEARCH_MODEL.model,
    );
    this.logRejections('Headline research', rejected);
    tracker.research.push(
      ...accepted.filter((research) => research.catalystType !== 'none'),
    );
  }

  private async researchWithWebSearch(
    subjects: ResearchSubject[],
    prompt: string,
    tracker: Tracker,
  ): Promise<void> {
    const route = UNEXPLAINED_HIT_RESEARCH_MODEL;
    const conversation: Anthropic.MessageParam[] = [
      { role: 'user', content: prompt },
    ];
    const urls = new Set(
      subjects.flatMap((s) => s.headlines.map((h) => h.url)),
    );
    let succeededSearches = 0;

    let message: Anthropic.Message | null = null;
    for (let turn = 0; turn <= MAX_PAUSE_CONTINUATIONS; turn++) {
      message = await this.messages.create({
        model: route.model,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: SYSTEM_PROMPT,
        messages: conversation,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: WEB_SEARCHES_PER_HIT * subjects.length,
          },
        ],
        output_config: { effort: 'medium' },
      });
      tracker.usage = addUsage(tracker.usage, usageOf(route, message));
      const searches = searchResults(message);
      searches.urls.forEach((url) => urls.add(url));
      succeededSearches += searches.succeeded;
      if (message.stop_reason !== 'pause_turn') break;
      conversation.push({ role: 'assistant', content: message.content });
    }

    if (!message || message.stop_reason !== 'end_turn') {
      this.logStop('Web search research', message, subjects);
      return;
    }

    const { accepted, rejected } = validateResults(
      extractResultsJson(textOf(message)),
      subjects,
      () => urls,
      route.model,
    );
    const searchRan = succeededSearches > 0;
    const kept = accepted.filter(
      (research) => research.catalystType !== 'none' || searchRan,
    );
    accepted
      .filter((research) => !kept.includes(research))
      .forEach((research) =>
        rejected.push({
          ticker: research.symbol,
          reason: 'none without any successful search',
        }),
      );
    this.logRejections('Web search research', rejected);
    tracker.research.push(...kept);
  }

  private logStop(
    step: string,
    message: Anthropic.Message | null,
    subjects: ResearchSubject[],
  ) {
    this.logger.warn(
      `${step} stopped with ${message?.stop_reason} for ${subjects.map((s) => s.symbol).join(', ')}`,
    );
  }

  private logRejections(step: string, rejected: Rejection[]) {
    if (rejected.length === 0) return;
    this.logger.warn(
      `${step} dropped ${rejected.length} item(s): ${rejected
        .map((r) => `${r.ticker || '?'} (${r.reason})`)
        .join(', ')}`,
    );
  }
}
