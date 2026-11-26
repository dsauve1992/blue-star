import { Inject, Injectable } from '@nestjs/common';
import { ANTHROPIC_MESSAGES } from '../../constants/tokens';
import {
  ClusterProposalError,
  ClusterProposalInput,
  ClusterProposalResult,
  ClusterProposer,
} from '../../domain/services/cluster-proposer.service';
import {
  ALTERNATIVE_KINDS,
  ClusterProposalSet,
} from '../../domain/value-objects/cluster-proposal';
import type { AnthropicMessages } from './anthropic-messages.client';
import {
  CLAUDE_SONNET_5_5,
  textOf,
  usageOf,
} from './anthropic-hit-researcher.service';

export const CLUSTERING_MODEL = CLAUDE_SONNET_5_5;
const MAX_OUTPUT_TOKENS = 16000;

const SYSTEM_PROMPT = `You group the biggest gainers of a US trading session into theme clusters, using research on why each stock moved.
A cluster needs a shared catalyst: one event or development that moved every member (a policy decision, a contract award, a read-through from a peer's earnings, a commodity move). A shared business or industry alone is not a cluster.
Propose a new cluster only when at least 3 tickers share its catalyst. A ticker may belong to two clusters when two catalysts both apply to it.
When a hit shares the catalyst of a cluster that is already tracked, propose it as an addition to that cluster, by the cluster's id, rather than a new cluster.
When the grouping of a new cluster is debatable, give alternatives: a split into narrower clusters, or a merge with another proposed cluster, each listing the resulting clusters in full.
Put every hit that is in no new cluster and no addition in unclustered, with the reason.
Use only tickers from the hits and from the tracked clusters' members. Every source is a URL copied exactly from the research or the tracked clusters; never invent one, and use null when there is none.`;

const MEMBER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['ticker', 'reason', 'catalystToday', 'source'],
  properties: {
    ticker: { type: 'string' },
    reason: { type: 'string' },
    catalystToday: { type: 'string' },
    source: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  },
};

const CLUSTER_PROPERTIES = {
  name: { type: 'string' },
  description: { type: 'string' },
  sharedCatalyst: { type: 'string' },
  sources: { type: 'array', items: { type: 'string' } },
  members: { type: 'array', items: MEMBER_SCHEMA },
};

const CLUSTER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: Object.keys(CLUSTER_PROPERTIES),
  properties: CLUSTER_PROPERTIES,
};

const ALTERNATIVE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'description', 'clusters'],
  properties: {
    kind: { type: 'string', enum: [...ALTERNATIVE_KINDS] },
    description: { type: 'string' },
    clusters: { type: 'array', items: CLUSTER_SCHEMA },
  },
};

export const PROPOSALS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['newClusters', 'additions', 'unclustered'],
  properties: {
    newClusters: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [...Object.keys(CLUSTER_PROPERTIES), 'alternatives'],
        properties: {
          ...CLUSTER_PROPERTIES,
          alternatives: { type: 'array', items: ALTERNATIVE_SCHEMA },
        },
      },
    },
    additions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['existingClusterId', 'ticker', 'reason', 'source'],
        properties: {
          existingClusterId: { type: 'string' },
          ticker: { type: 'string' },
          reason: { type: 'string' },
          source: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        },
      },
    },
    unclustered: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['ticker', 'reason'],
        properties: {
          ticker: { type: 'string' },
          reason: { type: 'string' },
        },
      },
    },
  },
};

function promptOf(input: ClusterProposalInput): string {
  return JSON.stringify({
    sessionDate: input.scanDate.value,
    hits: input.research.map((item) => ({
      ticker: item.symbol,
      business: item.business,
      catalystToday: item.catalystToday,
      catalystType: item.catalystType,
      source: item.source,
    })),
    trackedClusters: input.trackedClusters.map((cluster) => ({
      id: cluster.id,
      name: cluster.name,
      sharedCatalyst: cluster.sharedCatalyst,
      sources: cluster.sources,
      activeMembers: cluster.activeMembers,
    })),
  });
}

@Injectable()
export class AnthropicClusterProposer implements ClusterProposer {
  readonly model = CLUSTERING_MODEL.model;

  constructor(
    @Inject(ANTHROPIC_MESSAGES)
    private readonly messages: AnthropicMessages,
  ) {}

  async propose(input: ClusterProposalInput): Promise<ClusterProposalResult> {
    const message = await this.messages.create({
      model: CLUSTERING_MODEL.model,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: promptOf(input) }],
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: PROPOSALS_SCHEMA },
      },
    });
    const usage = usageOf(CLUSTERING_MODEL, message);

    if (message.stop_reason !== 'end_turn') {
      throw new ClusterProposalError(
        `Clustering stopped with ${message.stop_reason}`,
        usage,
      );
    }
    try {
      return {
        proposals: JSON.parse(textOf(message)) as ClusterProposalSet,
        usage,
      };
    } catch {
      throw new ClusterProposalError('Clustering returned invalid JSON', usage);
    }
  }
}
