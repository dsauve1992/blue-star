import Anthropic from '@anthropic-ai/sdk';
import {
  AnthropicClusterProposer,
  PROPOSALS_SCHEMA,
} from './anthropic-cluster-proposer.service';
import { ClusterProposalError } from '../../domain/services/cluster-proposer.service';
import { ClusterProposalSet } from '../../domain/value-objects/cluster-proposal';
import { SessionDate } from '../../domain/value-objects/session-date';
import { CLUSTER_ID, proposedCluster } from '../../test/fixtures';

const proposals: ClusterProposalSet = {
  newClusters: [proposedCluster()],
  additions: [],
  unclustered: [{ ticker: 'DDD', reason: 'Own earnings beat' }],
};

const message = (text: string, stopReason = 'end_turn'): Anthropic.Message =>
  ({
    id: 'msg',
    type: 'message',
    role: 'assistant',
    model: 'claude-sonnet-5-5',
    content: [{ type: 'text', text }],
    stop_reason: stopReason,
    usage: {
      input_tokens: 20000,
      output_tokens: 3000,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
      server_tool_use: null,
    },
  }) as unknown as Anthropic.Message;

const input = {
  scanDate: SessionDate.of('2026-11-25'),
  research: [
    {
      symbol: 'AAA',
      business: 'Fuel supplier',
      catalystToday: 'DOE loan program',
      catalystType: 'sector' as const,
      source: 'https://news.example.com/AAA',
      model: 'claude-haiku-5-5',
    },
  ],
  trackedClusters: [
    {
      id: CLUSTER_ID,
      name: 'Uranium',
      sharedCatalyst: 'Spot squeeze',
      sources: [],
      activeMembers: [{ ticker: 'TRK', source: null }],
    },
  ],
};

const usage = {
  inputTokens: 20000,
  outputTokens: 3000,
  webSearchRequests: 0,
  costUsd: 0.07,
};

describe('AnthropicClusterProposer', () => {
  let create: jest.Mock<
    Promise<Anthropic.Message>,
    [Anthropic.MessageCreateParamsNonStreaming]
  >;
  let proposer: AnthropicClusterProposer;

  beforeEach(() => {
    create = jest.fn<
      Promise<Anthropic.Message>,
      [Anthropic.MessageCreateParamsNonStreaming]
    >();
    proposer = new AnthropicClusterProposer({ create });
  });

  it('should ask Sonnet 5.5 for schema-constrained proposals from the research and tracked clusters', async () => {
    create.mockResolvedValue(message(JSON.stringify(proposals)));

    await proposer.propose(input);

    const params = create.mock.calls[0][0];
    expect(params.model).toBe('claude-sonnet-5-5');
    expect(params.output_config).toEqual({
      effort: 'medium',
      format: { type: 'json_schema', schema: PROPOSALS_SCHEMA },
    });
    expect(params.system).toContain(
      'A shared business or industry alone is not a cluster',
    );
    expect(params.system).toContain('A ticker may belong to two clusters');
    expect(JSON.parse(params.messages[0].content as string)).toEqual({
      sessionDate: '2026-11-25',
      hits: [
        {
          ticker: 'AAA',
          business: 'Fuel supplier',
          catalystToday: 'DOE loan program',
          catalystType: 'sector',
          source: 'https://news.example.com/AAA',
        },
      ],
      trackedClusters: [
        {
          id: CLUSTER_ID,
          name: 'Uranium',
          sharedCatalyst: 'Spot squeeze',
          sources: [],
          activeMembers: [{ ticker: 'TRK', source: null }],
        },
      ],
    });
  });

  it('should return the parsed proposals with Sonnet pricing', async () => {
    create.mockResolvedValue(message(JSON.stringify(proposals)));

    const result = await proposer.propose(input);

    expect(result.proposals).toEqual(proposals);
    expect(result.usage.inputTokens).toBe(usage.inputTokens);
    expect(result.usage.outputTokens).toBe(usage.outputTokens);
    expect(result.usage.costUsd).toBeCloseTo(usage.costUsd, 10);
  });

  it.each(['refusal', 'max_tokens'])(
    'should fail with the usage when the model stops with %s',
    async (stopReason) => {
      create.mockResolvedValue(message('', stopReason));

      const error = await proposer.propose(input).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ClusterProposalError);
      expect((error as ClusterProposalError).message).toBe(
        `Clustering stopped with ${stopReason}`,
      );
      expect((error as ClusterProposalError).usage.inputTokens).toBe(20000);
    },
  );

  it('should fail with the usage on invalid JSON', async () => {
    create.mockResolvedValue(message('{"newClusters": ['));

    await expect(proposer.propose(input)).rejects.toThrow(
      new ClusterProposalError('Clustering returned invalid JSON', usage),
    );
  });
});
