import {
  ClusterProposalSet,
  TrackedClusterContext,
} from '../value-objects/cluster-proposal';
import { validateProposals } from './proposal-validator';
import {
  CLUSTER_ID,
  proposedCluster,
  proposedMember,
} from '../../test/fixtures';

describe('validateProposals', () => {
  const tracked: TrackedClusterContext = {
    id: CLUSTER_ID,
    name: 'Uranium',
    sharedCatalyst: 'Spot uranium squeeze',
    sources: ['https://news.example.com/uranium'],
    activeMembers: [{ ticker: 'TRK', source: null }],
  };
  const context = {
    hitSymbols: new Set(['AAA', 'BBB', 'CCC', 'DDD', 'EEE', 'FFF']),
    trackedClusters: [tracked],
    knownSources: new Set(
      ['AAA', 'BBB', 'CCC', 'DDD', 'EEE', 'FFF'].map(
        (ticker) => `https://news.example.com/${ticker}`,
      ),
    ),
  };
  const set = (overrides: Partial<ClusterProposalSet>): ClusterProposalSet => ({
    newClusters: [],
    additions: [],
    unclustered: [],
    ...overrides,
  });

  it('should keep a valid cluster as proposed', () => {
    const result = validateProposals(
      set({ newClusters: [proposedCluster()] }),
      context,
    );

    expect(result).toEqual({
      proposals: {
        newClusters: [proposedCluster()],
        additions: [],
        unclustered: [],
      },
      dropped: [],
    });
  });

  it('should drop a cluster with only two members', () => {
    const result = validateProposals(
      set({
        newClusters: [
          proposedCluster({
            members: [proposedMember('AAA'), proposedMember('BBB')],
          }),
        ],
      }),
      context,
    );

    expect(result.proposals.newClusters).toEqual([]);
    expect(result.dropped).toEqual([
      'Cluster "Nuclear fuel": 2 valid member(s), needs 3',
    ]);
  });

  it('should drop an unknown ticker and the cluster it leaves too small', () => {
    const result = validateProposals(
      set({
        newClusters: [
          proposedCluster({
            members: [
              proposedMember('AAA'),
              proposedMember('BBB'),
              proposedMember('ZZZ'),
            ],
          }),
        ],
      }),
      context,
    );

    expect(result.proposals.newClusters).toEqual([]);
    expect(result.dropped).toEqual([
      'Cluster "Nuclear fuel": ZZZ is neither a hit nor a tracked member',
      'Cluster "Nuclear fuel": 2 valid member(s), needs 3',
    ]);
  });

  it('should keep a cluster without its unknown ticker when 3 valid members remain', () => {
    const result = validateProposals(
      set({
        newClusters: [
          proposedCluster({
            members: ['AAA', 'BBB', 'ZZZ', 'CCC'].map((t) => proposedMember(t)),
          }),
        ],
      }),
      context,
    );

    expect(result.proposals.newClusters).toEqual([proposedCluster()]);
  });

  it('should keep a ticker that belongs to two valid clusters', () => {
    const second = proposedCluster({
      name: 'Grid storage',
      members: ['CCC', 'DDD', 'EEE'].map((t) => proposedMember(t)),
    });

    const result = validateProposals(
      set({ newClusters: [proposedCluster(), second] }),
      context,
    );

    expect(result.proposals.newClusters).toEqual([proposedCluster(), second]);
    expect(result.dropped).toEqual([]);
  });

  it('should accept a tracked member that is not a hit as a cluster member', () => {
    const cluster = proposedCluster({
      members: ['AAA', 'BBB', 'TRK'].map((t) =>
        proposedMember(t, { source: null }),
      ),
    });

    const result = validateProposals(set({ newClusters: [cluster] }), context);

    expect(result.proposals.newClusters).toEqual([cluster]);
  });

  it('should null a source that does not come from the research', () => {
    const result = validateProposals(
      set({
        newClusters: [
          proposedCluster({
            sources: ['https://invented.example.com'],
            members: [
              proposedMember('AAA', { source: 'https://invented.example.com' }),
              proposedMember('BBB'),
              proposedMember('CCC'),
            ],
          }),
        ],
      }),
      context,
    );

    expect(result.proposals.newClusters).toEqual([
      proposedCluster({
        sources: [],
        members: [
          proposedMember('AAA', { source: null }),
          proposedMember('BBB'),
          proposedMember('CCC'),
        ],
      }),
    ]);
  });

  it('should drop an invalid alternative and keep the valid one', () => {
    const valid = {
      kind: 'split' as const,
      description: 'Fuel vs reactors',
      clusters: [
        {
          name: 'Nuclear fuel',
          description: 'Fuel only',
          sharedCatalyst: 'DOE loan program',
          sources: [],
          members: ['AAA', 'BBB', 'CCC'].map((t) => proposedMember(t)),
        },
      ],
    };
    const invalid = {
      kind: 'merge' as const,
      description: 'With grid storage',
      clusters: [
        {
          ...valid.clusters[0],
          members: [proposedMember('AAA'), proposedMember('QQQ')],
        },
      ],
    };

    const result = validateProposals(
      set({
        newClusters: [proposedCluster({ alternatives: [invalid, valid] })],
      }),
      context,
    );

    expect(result.proposals.newClusters).toEqual([
      proposedCluster({ alternatives: [valid] }),
    ]);
    expect(result.dropped).toEqual([
      'Cluster "Nuclear fuel" alternative 1 (merge) cluster 1: QQQ is neither a hit nor a tracked member',
      'Cluster "Nuclear fuel" alternative 1 (merge) cluster 1: 1 valid member(s), needs 3',
      'Cluster "Nuclear fuel" alternative 1 (merge): dropped',
    ]);
  });

  it('should keep an addition to a tracked cluster with its name', () => {
    const result = validateProposals(
      set({
        additions: [
          {
            existingClusterId: CLUSTER_ID,
            ticker: 'FFF',
            reason: 'Also a uranium miner',
            source: 'https://news.example.com/FFF',
          },
        ],
      }),
      context,
    );

    expect(result.proposals.additions).toEqual([
      {
        existingClusterId: CLUSTER_ID,
        existingClusterName: 'Uranium',
        ticker: 'FFF',
        reason: 'Also a uranium miner',
        source: 'https://news.example.com/FFF',
      },
    ]);
  });

  it('should drop additions to unknown clusters and of existing members', () => {
    const unknownId = '99999999-9999-4999-8999-999999999999';

    const result = validateProposals(
      set({
        additions: [
          {
            existingClusterId: unknownId,
            ticker: 'FFF',
            reason: 'r',
            source: null,
          },
          {
            existingClusterId: 'not-a-uuid',
            ticker: 'FFF',
            reason: 'r',
            source: null,
          },
          {
            existingClusterId: CLUSTER_ID,
            ticker: 'TRK',
            reason: 'r',
            source: null,
          },
          {
            existingClusterId: CLUSTER_ID,
            ticker: 'ZZZ',
            reason: 'r',
            source: null,
          },
        ],
      }),
      context,
    );

    expect(result.proposals.additions).toEqual([]);
    expect(result.dropped).toEqual([
      `Addition FFF to ${unknownId}: unknown tracked cluster`,
      'Addition FFF to not-a-uuid: unknown tracked cluster',
      `Addition TRK to ${CLUSTER_ID}: already an active member`,
      `Addition ZZZ to ${CLUSTER_ID}: neither a hit nor a tracked member`,
    ]);
  });

  it('should keep unclustered hits and drop unknown or repeated ones', () => {
    const result = validateProposals(
      set({
        unclustered: [
          { ticker: 'ddd', reason: 'Idiosyncratic earnings beat' },
          { ticker: 'DDD', reason: 'again' },
          { ticker: 'ZZZ', reason: 'not a hit' },
        ],
      }),
      context,
    );

    expect(result.proposals.unclustered).toEqual([
      { ticker: 'DDD', reason: 'Idiosyncratic earnings beat' },
    ]);
    expect(result.dropped).toEqual(['Unclustered ZZZ: not a hit']);
  });
});
