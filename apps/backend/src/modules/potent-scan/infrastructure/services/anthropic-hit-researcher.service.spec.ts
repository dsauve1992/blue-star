import Anthropic from '@anthropic-ai/sdk';
import {
  AnthropicHitResearcher,
  HEADLINE_RESEARCH_MODEL,
  MAX_PROMPT_TOKENS,
  UNEXPLAINED_HIT_RESEARCH_MODEL,
} from './anthropic-hit-researcher.service';
import { AnthropicMessages } from './anthropic-messages.client';
import { CLAUDE_HAIKU_5_5, costOf } from './anthropic-pricing';
import { HitResearchBatchError } from '../../domain/services/hit-researcher.service';
import { ResearchSubject } from '../../domain/value-objects/hit-research';
import { SessionDate } from '../../domain/value-objects/session-date';

const SESSION = SessionDate.of('2026-11-25');

const subject = (
  symbol: string,
  urls: string[] = [`https://news.example.com/${symbol}`],
): ResearchSubject => ({
  symbol,
  exchange: 'NASDAQ',
  sector: 'Technology',
  industry: 'Semiconductors',
  changePct: 14,
  headlines: urls.map((url) => ({
    title: `${symbol} headline`,
    publisher: 'Reuters',
    url,
    publishedAt: '2026-11-25T21:00:00Z',
  })),
  fetchError: null,
});

const item = (
  ticker: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  ticker,
  business: `${ticker} makes chips`,
  catalystToday: 'Beat and raised',
  catalystType: 'earnings',
  source: `https://news.example.com/${ticker}`,
  ...overrides,
});

const message = (
  content: unknown[],
  {
    stopReason = 'end_turn',
    inputTokens = 1000,
    outputTokens = 100,
    webSearchRequests = 0,
  }: {
    stopReason?: string;
    inputTokens?: number;
    outputTokens?: number;
    webSearchRequests?: number;
  } = {},
): Anthropic.Message =>
  ({
    id: 'msg',
    type: 'message',
    role: 'assistant',
    model: 'claude-haiku-5-5',
    content,
    stop_reason: stopReason,
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
      server_tool_use: { web_search_requests: webSearchRequests },
    },
  }) as unknown as Anthropic.Message;

const jsonMessage = (
  results: Record<string, unknown>[],
  options?: Parameters<typeof message>[1],
) => message([{ type: 'text', text: JSON.stringify({ results }) }], options);

const searchMessage = (
  urls: string[],
  results: Record<string, unknown>[],
  options: Parameters<typeof message>[1] = { webSearchRequests: 1 },
) =>
  message(
    [
      {
        type: 'server_tool_use',
        id: 'srv1',
        name: 'web_search',
        input: { query: 'why stock up' },
      },
      {
        type: 'web_search_tool_result',
        tool_use_id: 'srv1',
        content: urls.map((url) => ({
          type: 'web_search_result',
          url,
          title: 'result',
          encrypted_content: 'x',
          page_age: null,
        })),
      },
      {
        type: 'text',
        text: `Here is the summary: ${JSON.stringify({ results })}`,
      },
    ],
    options,
  );

const tickersIn = (p: Anthropic.MessageCreateParamsNonStreaming): string[] =>
  (
    JSON.parse((p.messages[0].content as string).split('\n\n')[1]) as {
      tickers: { ticker: string }[];
    }
  ).tickers.map((t) => t.ticker);

describe('AnthropicHitResearcher', () => {
  let create: jest.Mock<
    Promise<Anthropic.Message>,
    [Anthropic.MessageCreateParamsNonStreaming]
  >;
  let researcher: AnthropicHitResearcher;

  beforeEach(() => {
    create = jest.fn<
      Promise<Anthropic.Message>,
      [Anthropic.MessageCreateParamsNonStreaming]
    >();
    const messages: AnthropicMessages = { create };
    researcher = new AnthropicHitResearcher(messages);
  });

  const params = (call: number) => create.mock.calls[call][0];

  it('should research headline-explained hits in one structured-output call without web search', async () => {
    create.mockResolvedValueOnce(jsonMessage([item('AAA'), item('BBB')]));

    const result = await researcher.research(SESSION, [
      subject('AAA'),
      subject('BBB'),
    ]);

    expect(create).toHaveBeenCalledTimes(1);
    expect(params(0).model).toBe(HEADLINE_RESEARCH_MODEL.model);
    expect(params(0).tools).toBeUndefined();
    expect(params(0).output_config?.format?.type).toBe('json_schema');
    expect(result.research).toEqual([
      {
        symbol: 'AAA',
        business: 'AAA makes chips',
        catalystToday: 'Beat and raised',
        catalystType: 'earnings',
        source: 'https://news.example.com/AAA',
        model: 'claude-haiku-5-5',
      },
      {
        symbol: 'BBB',
        business: 'BBB makes chips',
        catalystToday: 'Beat and raised',
        catalystType: 'earnings',
        source: 'https://news.example.com/BBB',
        model: 'claude-haiku-5-5',
      },
    ]);
  });

  it('should route unexplained and headline-less hits to the web search model', async () => {
    create
      .mockResolvedValueOnce(
        jsonMessage([
          item('AAA'),
          item('BBB', { catalystType: 'none', source: null }),
        ]),
      )
      .mockResolvedValueOnce(
        searchMessage(
          ['https://wire.example.com/bbb', 'https://wire.example.com/ccc'],
          [
            item('BBB', {
              catalystType: 'upgrade',
              source: 'https://wire.example.com/bbb',
            }),
            item('CCC', {
              catalystType: 'm&a',
              source: 'https://wire.example.com/ccc',
            }),
          ],
        ),
      );

    const result = await researcher.research(SESSION, [
      subject('AAA'),
      subject('BBB'),
      subject('CCC', []),
    ]);

    const headlineTickers = tickersIn(params(0));
    expect(headlineTickers).toEqual(['AAA', 'BBB']);
    expect(params(1).model).toBe(UNEXPLAINED_HIT_RESEARCH_MODEL.model);
    expect(params(1).tools).toEqual([
      { type: 'web_search_20250305', name: 'web_search', max_uses: 4 },
    ]);
    expect(params(1).output_config?.format).toBeUndefined();
    expect(
      result.research.map((r) => [r.symbol, r.catalystType, r.source]),
    ).toEqual([
      ['AAA', 'earnings', 'https://news.example.com/AAA'],
      ['BBB', 'upgrade', 'https://wire.example.com/bbb'],
      ['CCC', 'm&a', 'https://wire.example.com/ccc'],
    ]);
  });

  it('should drop unknown tickers, duplicates, invalid catalyst types and invented sources', async () => {
    create
      .mockResolvedValueOnce(
        jsonMessage([
          item('AAA'),
          item('AAA', { business: 'duplicate' }),
          item('ZZZ'),
          item('BBB', { catalystType: 'rumour' }),
          item('CCC', { source: 'https://invented.example.com/ccc' }),
        ]),
      )
      .mockResolvedValueOnce(
        searchMessage(
          ['https://wire.example.com/bbb'],
          [
            item('BBB', { source: 'https://wire.example.com/bbb' }),
            item('CCC', { source: 'https://invented.example.com/again' }),
          ],
        ),
      );

    const result = await researcher.research(SESSION, [
      subject('AAA'),
      subject('BBB'),
      subject('CCC'),
    ]);

    expect(tickersIn(params(1))).toEqual(['BBB', 'CCC']);
    expect(result.research.map((r) => [r.symbol, r.business])).toEqual([
      ['AAA', 'AAA makes chips'],
      ['BBB', 'BBB makes chips'],
    ]);
  });

  it.each([
    ['an invalid catalystType', { catalystType: 'analyst' }],
    ['a blank business', { business: '   ' }],
    ['an empty catalystToday', { catalystToday: '' }],
    ['a catalyst without source', { catalystType: 'earnings', source: null }],
  ])(
    'should drop a web search answer with %s',
    async (_, overrides: Record<string, unknown>) => {
      create.mockResolvedValueOnce(
        searchMessage(
          ['https://wire.example.com/aaa'],
          [
            item('AAA', {
              source: 'https://wire.example.com/aaa',
              ...overrides,
            }),
          ],
        ),
      );

      const result = await researcher.research(SESSION, [subject('AAA', [])]);

      expect(result.research).toEqual([]);
    },
  );

  it('should accept "none" with no source once web search found nothing', async () => {
    create.mockResolvedValueOnce(
      searchMessage([], [item('AAA', { catalystType: 'none', source: null })]),
    );

    const result = await researcher.research(SESSION, [subject('AAA', [])]);

    expect(result.research).toEqual([
      {
        symbol: 'AAA',
        business: 'AAA makes chips',
        catalystToday: 'Beat and raised',
        catalystType: 'none',
        source: null,
        model: UNEXPLAINED_HIT_RESEARCH_MODEL.model,
      },
    ]);
  });

  it('should search in batches of three with two searches per hit', async () => {
    create.mockImplementation((p) => {
      const tickers = tickersIn(p).map((ticker) =>
        item(ticker, { source: null, catalystType: 'none' }),
      );
      return Promise.resolve(searchMessage([], tickers));
    });

    await researcher.research(
      SESSION,
      ['A', 'B', 'C', 'D', 'E'].map((s) => subject(s, [])),
    );

    expect(create.mock.calls.map(([p]) => p.tools?.[0])).toEqual([
      { type: 'web_search_20250305', name: 'web_search', max_uses: 6 },
      { type: 'web_search_20250305', name: 'web_search', max_uses: 4 },
    ]);
  });

  it('should continue a paused search turn and sum its usage', async () => {
    const paused = message(
      [{ type: 'server_tool_use', id: 's', name: 'web_search', input: {} }],
      { stopReason: 'pause_turn', inputTokens: 2000, webSearchRequests: 1 },
    );
    create
      .mockResolvedValueOnce(paused)
      .mockResolvedValueOnce(
        searchMessage(
          ['https://wire.example.com/aaa'],
          [item('AAA', { source: 'https://wire.example.com/aaa' })],
        ),
      );

    const result = await researcher.research(SESSION, [subject('AAA', [])]);

    expect(params(1).messages).toEqual([
      params(0).messages[0],
      { role: 'assistant', content: paused.content },
    ]);
    expect(result.research).toHaveLength(1);
    expect(result.usage).toEqual({
      inputTokens: 3000,
      outputTokens: 200,
      webSearchRequests: 2,
      costUsd:
        costOf(CLAUDE_HAIKU_5_5, 2000, 100, 1) +
        costOf(CLAUDE_HAIKU_5_5, 1000, 100, 1),
    });
  });

  it('should return no research for a refused batch instead of failing', async () => {
    create
      .mockResolvedValueOnce(message([], { stopReason: 'refusal' }))
      .mockResolvedValueOnce(message([], { stopReason: 'refusal' }));

    const result = await researcher.research(SESSION, [subject('AAA')]);

    expect(result.research).toEqual([]);
  });

  it('should split a batch whose prompt would exceed the token budget', async () => {
    const longUrl = (s: string, i: number) =>
      `https://news.example.com/${s}/${i}/${'x'.repeat(14_000)}`;
    const big = (s: string) =>
      subject(
        s,
        Array.from({ length: 10 }, (_, i) => longUrl(s, i)),
      );
    create.mockImplementation((p) => {
      const tickers = tickersIn(p).map((ticker) =>
        item(ticker, { source: longUrl(ticker, 0) }),
      );
      return Promise.resolve(jsonMessage(tickers));
    });

    const result = await researcher.research(SESSION, [big('AAA'), big('BBB')]);

    expect(create).toHaveBeenCalledTimes(2);
    for (const [p] of create.mock.calls) {
      expect((p.messages[0].content as string).length / 3).toBeLessThan(
        MAX_PROMPT_TOKENS,
      );
    }
    expect(result.research.map((r) => r.symbol)).toEqual(['AAA', 'BBB']);
  });

  it('should fail the batch with the usage already spent when the API errors', async () => {
    create
      .mockResolvedValueOnce(
        jsonMessage([item('AAA', { catalystType: 'none', source: null })]),
      )
      .mockRejectedValueOnce(new Error('ANTHROPIC_API_KEY is not set'));

    const failure = researcher.research(SESSION, [subject('AAA')]);

    await expect(failure).rejects.toThrow(HitResearchBatchError);
    await expect(failure).rejects.toMatchObject({
      message: 'ANTHROPIC_API_KEY is not set',
      usage: {
        inputTokens: 1000,
        outputTokens: 100,
        webSearchRequests: 0,
        costUsd: costOf(CLAUDE_HAIKU_5_5, 1000, 100, 0),
      },
    });
  });

  it('should keep the headline research already paid for when a later search call fails', async () => {
    create
      .mockResolvedValueOnce(
        jsonMessage([
          item('AAA'),
          item('BBB', { catalystType: 'none', source: null }),
        ]),
      )
      .mockRejectedValueOnce(new Error('overloaded'));

    const failure = researcher.research(SESSION, [
      subject('AAA'),
      subject('BBB'),
    ]);

    await expect(failure).rejects.toMatchObject({
      research: [
        {
          symbol: 'AAA',
          business: 'AAA makes chips',
          catalystToday: 'Beat and raised',
          catalystType: 'earnings',
          source: 'https://news.example.com/AAA',
          model: 'claude-haiku-5-5',
        },
      ],
    });
  });

  it.each([
    ['no search ran', [{ type: 'text', text: '{"results": []}' }]],
    [
      'every search failed',
      [
        {
          type: 'web_search_tool_result',
          tool_use_id: 's',
          content: {
            type: 'web_search_tool_result_error',
            error_code: 'unavailable',
          },
        },
      ],
    ],
  ])('should not accept "none" when %s', async (_, searchBlocks) => {
    create.mockResolvedValueOnce(
      message([
        ...searchBlocks,
        {
          type: 'text',
          text: JSON.stringify({
            results: [item('AAA', { catalystType: 'none', source: null })],
          }),
        },
      ]),
    );

    const result = await researcher.research(SESSION, [subject('AAA', [])]);

    expect(result.research).toEqual([]);
  });

  it('should accept "none" when a search succeeded and a later one hit max_uses_exceeded', async () => {
    create.mockResolvedValueOnce(
      message(
        [
          {
            type: 'web_search_tool_result',
            tool_use_id: 's1',
            content: [],
          },
          {
            type: 'web_search_tool_result',
            tool_use_id: 's2',
            content: {
              type: 'web_search_tool_result_error',
              error_code: 'max_uses_exceeded',
            },
          },
          {
            type: 'text',
            text: JSON.stringify({
              results: [
                item('AAA', { catalystType: 'none', source: null }),
                item('BBB', { catalystType: 'none', source: null }),
              ],
            }),
          },
        ],
        { webSearchRequests: 1 },
      ),
    );

    const result = await researcher.research(SESSION, [
      subject('AAA', []),
      subject('BBB', []),
    ]);

    expect(result.research.map((r) => [r.symbol, r.catalystType])).toEqual([
      ['AAA', 'none'],
      ['BBB', 'none'],
    ]);
  });

  it('should split a web search batch whose prompt would exceed the token budget', async () => {
    const longUrl = (s: string) =>
      `https://news.example.com/${s}/${'x'.repeat(140_000)}`;
    create.mockImplementation((p) =>
      Promise.resolve(
        p.tools
          ? searchMessage(
              [],
              tickersIn(p).map((ticker) =>
                item(ticker, { catalystType: 'none', source: null }),
              ),
            )
          : jsonMessage(
              tickersIn(p).map((ticker) =>
                item(ticker, { catalystType: 'none', source: null }),
              ),
            ),
      ),
    );

    const result = await researcher.research(SESSION, [
      subject('AAA', [longUrl('AAA')]),
      subject('BBB', [longUrl('BBB')]),
    ]);

    const searchCalls = create.mock.calls.filter(([p]) => p.tools);
    expect(searchCalls.map(([p]) => tickersIn(p))).toEqual([['AAA'], ['BBB']]);
    expect(result.research.map((r) => r.symbol)).toEqual(['AAA', 'BBB']);
  });
});

describe('costOf', () => {
  it('should price Haiku 5.5 at the short-prompt rate up to 100K input tokens', () => {
    expect(costOf(CLAUDE_HAIKU_5_5, 100_000, 10_000, 0)).toBeCloseTo(
      0.01 + 0.005,
      10,
    );
  });

  it('should price Haiku 5.5 at the long-prompt rate above 100K input tokens', () => {
    expect(costOf(CLAUDE_HAIKU_5_5, 200_000, 10_000, 0)).toBeCloseTo(
      0.1 + 0.025,
      10,
    );
  });

  it('should add ten dollars per thousand web searches', () => {
    expect(costOf(CLAUDE_HAIKU_5_5, 0, 0, 3)).toBeCloseTo(0.03, 10);
  });
});
