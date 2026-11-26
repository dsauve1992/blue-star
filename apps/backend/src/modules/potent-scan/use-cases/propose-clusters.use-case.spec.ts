import { Test } from '@nestjs/testing';
import { UuidGeneratorService } from '../../../shared/services/uuid-generator.service';
import {
  CLUSTER_PROPOSER,
  CLUSTER_REPOSITORY,
  HIT_RESEARCH_REPOSITORY,
  POTENT_SCAN_REPOSITORY,
  PROPOSAL_REPOSITORY,
} from '../constants/tokens';
import type { ClusterRepository } from '../domain/repositories/cluster.repository.interface';
import type { HitResearchRepository } from '../domain/repositories/hit-research.repository.interface';
import type { PotentScanRepository } from '../domain/repositories/potent-scan.repository.interface';
import type { ProposalRepository } from '../domain/repositories/proposal.repository.interface';
import {
  ClusterProposalError,
  ClusterProposalInput,
  ClusterProposalResult,
  ClusterProposer,
} from '../domain/services/cluster-proposer.service';
import { PotentScan } from '../domain/entities/potent-scan';
import { Proposal } from '../domain/entities/proposal';
import { HitResearch } from '../domain/value-objects/hit-research';
import { ProposalId } from '../domain/value-objects/proposal-id';
import { SessionDate } from '../domain/value-objects/session-date';
import { NotFoundError, StateError } from '../domain/domain-errors';
import {
  CLUSTER_ID,
  cluster,
  clusterMember,
  hit,
  proposedCluster,
  proposedMember,
} from '../test/fixtures';
import { ProposeClustersUseCase } from './propose-clusters.use-case';

class FakeClusterProposer implements ClusterProposer {
  readonly model = 'fake-sonnet';
  inputs: ClusterProposalInput[] = [];
  constructor(private outcome: ClusterProposalResult | Error) {}

  respond(outcome: ClusterProposalResult | Error) {
    this.outcome = outcome;
  }

  propose(input: ClusterProposalInput): Promise<ClusterProposalResult> {
    this.inputs.push(input);
    return this.outcome instanceof Error
      ? Promise.reject(this.outcome)
      : Promise.resolve(this.outcome);
  }
}

describe('ProposeClustersUseCase', () => {
  const NOW = new Date('2026-11-27T15:00:00.000Z');
  const SCAN_DATE = SessionDate.of('2026-11-25');
  const FIRST_ID = '55555555-5555-4555-8555-555555555555';
  const SECOND_ID = '66666666-6666-4666-8666-666666666666';
  const usage = {
    inputTokens: 20000,
    outputTokens: 3000,
    webSearchRequests: 0,
    costUsd: 0.07,
  };
  const research = (symbol: string): HitResearch => ({
    symbol,
    business: `${symbol} business`,
    catalystToday: 'DOE loan program announced',
    catalystType: 'sector',
    source: `https://news.example.com/${symbol}`,
    model: 'claude-haiku-5-5',
  });
  const addition = {
    existingClusterId: CLUSTER_ID,
    ticker: 'DDD',
    reason: 'Also an SMR fuel supplier',
    source: 'https://news.example.com/DDD',
  };

  let proposer: FakeClusterProposer;
  let proposals: jest.Mocked<ProposalRepository>;
  let useCase: ProposeClustersUseCase;

  beforeEach(async () => {
    jest.useFakeTimers({ now: NOW });
    jest
      .spyOn(UuidGeneratorService, 'generate')
      .mockReset()
      .mockReturnValueOnce(FIRST_ID)
      .mockReturnValueOnce(SECOND_ID);
    proposer = new FakeClusterProposer({
      proposals: {
        newClusters: [
          proposedCluster(),
          proposedCluster({
            name: 'Too small',
            members: [proposedMember('AAA'), proposedMember('EEE')],
          }),
        ],
        additions: [addition],
        unclustered: [{ ticker: 'EEE', reason: 'Own earnings beat' }],
      },
      usage,
    });
    proposals = {
      replacePending: jest.fn().mockResolvedValue(undefined),
      recordRun: jest.fn().mockResolvedValue(undefined),
      saveDecision: jest.fn(),
      findById: jest.fn(),
      findByScanDate: jest.fn(),
      findLatestSucceededRun: jest.fn(),
    };
    const scans: jest.Mocked<PotentScanRepository> = {
      replace: jest.fn(),
      exists: jest.fn(),
      findBySessionDate: jest.fn().mockResolvedValue(
        PotentScan.of({
          sessionDate: SCAN_DATE,
          universeSize: 2000,
          hits: ['AAA', 'BBB', 'CCC', 'DDD', 'EEE'].map((s) => hit(s)),
          nearMisses: [],
        }),
      ),
      findLatest: jest.fn(),
      listSessionDates: jest.fn(),
    };
    const researchRepository: jest.Mocked<HitResearchRepository> = {
      saveRun: jest.fn(),
      recordRun: jest.fn(),
      findByScanDate: jest
        .fn()
        .mockResolvedValue(['AAA', 'BBB', 'CCC', 'DDD', 'EEE'].map(research)),
    };
    const clusters: jest.Mocked<ClusterRepository> = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn().mockResolvedValue([
        cluster({
          members: [
            clusterMember('AAA'),
            clusterMember('BBB', { removedAt: NOW }),
          ],
        }),
      ]),
    };

    const module = await Test.createTestingModule({
      providers: [
        ProposeClustersUseCase,
        { provide: POTENT_SCAN_REPOSITORY, useValue: scans },
        { provide: HIT_RESEARCH_REPOSITORY, useValue: researchRepository },
        { provide: CLUSTER_REPOSITORY, useValue: clusters },
        { provide: CLUSTER_PROPOSER, useValue: proposer },
        { provide: PROPOSAL_REPOSITORY, useValue: proposals },
      ],
    }).compile();
    useCase = module.get(ProposeClustersUseCase);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should send the research and the tracked clusters active members to the proposer', async () => {
    await useCase.execute({ sessionDate: SCAN_DATE });

    expect(proposer.inputs).toEqual([
      {
        scanDate: SCAN_DATE,
        research: ['AAA', 'BBB', 'CCC', 'DDD', 'EEE'].map(research),
        trackedClusters: [
          {
            id: CLUSTER_ID,
            name: 'Nuclear',
            sharedCatalyst: null,
            sources: [],
            activeMembers: [{ ticker: 'AAA', source: null }],
          },
        ],
      },
    ]);
  });

  it('should store the validated proposals as pending with the run usage and unclustered hits', async () => {
    const result = await useCase.execute({ sessionDate: SCAN_DATE });

    expect(proposals.replacePending).toHaveBeenNthCalledWith(
      1,
      [
        Proposal.fromData({
          id: ProposalId.of(FIRST_ID),
          scanDate: SCAN_DATE,
          content: { kind: 'new_cluster', cluster: proposedCluster() },
          status: 'pending',
          appliedAlternative: null,
          clusterIds: [],
          createdAt: NOW,
          decidedAt: null,
        }),
        Proposal.fromData({
          id: ProposalId.of(SECOND_ID),
          scanDate: SCAN_DATE,
          content: {
            kind: 'addition',
            addition: { ...addition, existingClusterName: 'Nuclear' },
          },
          status: 'pending',
          appliedAlternative: null,
          clusterIds: [],
          createdAt: NOW,
          decidedAt: null,
        }),
      ],
      {
        scanDate: SCAN_DATE,
        status: 'succeeded',
        model: 'fake-sonnet',
        proposalCount: 2,
        unclustered: [{ ticker: 'EEE', reason: 'Own earnings beat' }],
        dropped: ['Cluster "Too small": 2 valid member(s), needs 3'],
        usage,
        error: null,
        startedAt: NOW,
        finishedAt: NOW,
      },
    );
    expect(result).toEqual({
      sessionDate: SCAN_DATE,
      newClusterCount: 1,
      additionCount: 1,
      unclusteredCount: 1,
      droppedCount: 1,
      usage,
    });
  });

  it('should record a failed run with its usage and keep existing proposals when the proposer fails', async () => {
    proposer.respond(
      new ClusterProposalError('Clustering stopped with refusal', usage),
    );

    await expect(useCase.execute({ sessionDate: SCAN_DATE })).rejects.toThrow(
      'Clustering stopped with refusal',
    );
    expect(proposals.replacePending).not.toHaveBeenCalled();
    expect(proposals.recordRun).toHaveBeenNthCalledWith(1, {
      scanDate: SCAN_DATE,
      status: 'failed',
      model: 'fake-sonnet',
      proposalCount: 0,
      unclustered: [],
      dropped: [],
      usage,
      error: 'Clustering stopped with refusal',
      startedAt: NOW,
      finishedAt: NOW,
    });
  });

  it('should fail when nothing valid remains after validation', async () => {
    proposer.respond({
      proposals: {
        newClusters: [proposedCluster({ members: [proposedMember('ZZZ')] })],
        additions: [],
        unclustered: [],
      },
      usage,
    });

    await expect(useCase.execute({ sessionDate: SCAN_DATE })).rejects.toThrow(
      StateError,
    );
    expect(proposals.replacePending).not.toHaveBeenCalled();
    expect(proposals.recordRun.mock.calls[0][0].status).toBe('failed');
  });

  it('should refuse to propose without research', async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProposeClustersUseCase,
        {
          provide: POTENT_SCAN_REPOSITORY,
          useValue: {
            findBySessionDate: jest.fn().mockResolvedValue(
              PotentScan.of({
                sessionDate: SCAN_DATE,
                universeSize: 1,
                hits: [hit('AAA')],
                nearMisses: [],
              }),
            ),
          },
        },
        {
          provide: HIT_RESEARCH_REPOSITORY,
          useValue: { findByScanDate: jest.fn().mockResolvedValue([]) },
        },
        { provide: CLUSTER_REPOSITORY, useValue: {} },
        { provide: CLUSTER_PROPOSER, useValue: proposer },
        { provide: PROPOSAL_REPOSITORY, useValue: proposals },
      ],
    }).compile();

    await expect(
      module.get(ProposeClustersUseCase).execute({ sessionDate: SCAN_DATE }),
    ).rejects.toThrow(new StateError('No hit research for 2026-11-25'));
    expect(proposer.inputs).toEqual([]);
  });

  it('should throw NotFoundError without a scan', async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProposeClustersUseCase,
        {
          provide: POTENT_SCAN_REPOSITORY,
          useValue: { findBySessionDate: jest.fn().mockResolvedValue(null) },
        },
        { provide: HIT_RESEARCH_REPOSITORY, useValue: {} },
        { provide: CLUSTER_REPOSITORY, useValue: {} },
        { provide: CLUSTER_PROPOSER, useValue: proposer },
        { provide: PROPOSAL_REPOSITORY, useValue: proposals },
      ],
    }).compile();

    await expect(
      module.get(ProposeClustersUseCase).execute({ sessionDate: SCAN_DATE }),
    ).rejects.toThrow(NotFoundError);
  });
});
