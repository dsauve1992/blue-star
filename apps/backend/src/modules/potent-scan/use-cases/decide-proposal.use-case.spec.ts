import { Test } from '@nestjs/testing';
import { UuidGeneratorService } from '../../../shared/services/uuid-generator.service';
import { Symbol } from '../../../shared/value-objects/symbol';
import {
  CLUSTER_REPOSITORY,
  HIT_RESEARCH_REPOSITORY,
  POTENT_SCAN_REPOSITORY,
  PROPOSAL_REPOSITORY,
} from '../constants/tokens';
import type { ClusterRepository } from '../domain/repositories/cluster.repository.interface';
import type { HitResearchRepository } from '../domain/repositories/hit-research.repository.interface';
import type { PotentScanRepository } from '../domain/repositories/potent-scan.repository.interface';
import type { ProposalRepository } from '../domain/repositories/proposal.repository.interface';
import { Cluster, ClusterMember } from '../domain/entities/cluster';
import { PotentScan } from '../domain/entities/potent-scan';
import { ProposedAddition } from '../domain/value-objects/cluster-proposal';
import { ClusterId } from '../domain/value-objects/cluster-id';
import { ProposalId } from '../domain/value-objects/proposal-id';
import { SessionDate } from '../domain/value-objects/session-date';
import {
  InvariantError,
  NotFoundError,
  StateError,
} from '../domain/domain-errors';
import {
  CLUSTER_ID,
  cluster,
  clusterMember,
  hit,
  memberId,
  PROPOSAL_ID,
  proposal,
  proposedCluster,
  proposedMember,
} from '../test/fixtures';
import { AcceptProposalUseCase } from './accept-proposal.use-case';
import { RejectProposalUseCase } from './reject-proposal.use-case';

describe('Proposal decision use cases', () => {
  const NOW = new Date('2026-11-27T15:00:00.000Z');
  const SCAN_DATE = SessionDate.of('2026-11-25');
  const NEW_ID = '55555555-5555-4555-8555-555555555555';
  const SECOND_ID = '66666666-6666-4666-8666-666666666666';
  const proposalId = ProposalId.of(PROPOSAL_ID);

  let proposals: jest.Mocked<ProposalRepository>;
  let clusters: jest.Mocked<ClusterRepository>;
  let scans: jest.Mocked<PotentScanRepository>;
  let research: jest.Mocked<HitResearchRepository>;
  let accept: AcceptProposalUseCase;
  let reject: RejectProposalUseCase;

  const member = (
    ticker: string,
    overrides: Partial<ClusterMember> = {},
  ): ClusterMember =>
    clusterMember(ticker, {
      joinedAt: NOW,
      reason: `${ticker} supplies SMR fuel`,
      catalyst: 'DOE loan program announced',
      source: `https://news.example.com/${ticker}`,
      ...overrides,
    });

  const created = (
    id: string,
    members: ClusterMember[],
    overrides: Partial<Parameters<typeof Cluster.fromData>[0]> = {},
  ): Cluster =>
    Cluster.fromData({
      id: ClusterId.of(id),
      name: 'Nuclear fuel',
      description: 'Fuel suppliers for small modular reactors',
      sharedCatalyst: 'DOE loan program',
      sources: ['https://news.example.com/AAA'],
      originProposalId: PROPOSAL_ID,
      sourceScanDate: SCAN_DATE,
      createdAt: NOW,
      status: 'tracking',
      closedAt: null,
      members,
      ...overrides,
    });

  const mockIds = (...ids: string[]) => {
    const generate = jest.spyOn(UuidGeneratorService, 'generate').mockReset();
    ids.forEach((id) => generate.mockReturnValueOnce(id));
  };

  const addition: ProposedAddition = {
    existingClusterId: CLUSTER_ID,
    existingClusterName: 'Nuclear',
    ticker: 'DDD',
    reason: 'Also an SMR fuel supplier',
    source: 'https://news.example.com/DDD',
  };

  beforeEach(async () => {
    jest.useFakeTimers({ now: NOW });
    proposals = {
      replacePending: jest.fn(),
      recordRun: jest.fn(),
      saveDecision: jest.fn().mockResolvedValue(true),
      findById: jest.fn().mockResolvedValue(proposal()),
      findByScanDate: jest.fn(),
      findLatestSucceededRun: jest.fn(),
    };
    clusters = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(cluster()),
      findAll: jest.fn(),
    };
    scans = {
      replace: jest.fn(),
      exists: jest.fn(),
      findBySessionDate: jest.fn().mockResolvedValue(
        PotentScan.of({
          sessionDate: SCAN_DATE,
          universeSize: 2000,
          hits: ['AAA', 'BBB', 'CCC', 'DDD'].map((s) => hit(s)),
          nearMisses: [],
        }),
      ),
      findLatest: jest.fn(),
      listSessionDates: jest.fn(),
    };
    research = {
      saveRun: jest.fn(),
      recordRun: jest.fn(),
      findByScanDate: jest.fn().mockResolvedValue([
        {
          symbol: 'DDD',
          business: 'Enrichment',
          catalystToday: 'Won a DOE enrichment contract',
          catalystType: 'sector',
          source: 'https://news.example.com/DDD',
          model: 'claude-haiku-5-5',
        },
      ]),
    };

    const module = await Test.createTestingModule({
      providers: [
        AcceptProposalUseCase,
        RejectProposalUseCase,
        { provide: PROPOSAL_REPOSITORY, useValue: proposals },
        { provide: CLUSTER_REPOSITORY, useValue: clusters },
        { provide: POTENT_SCAN_REPOSITORY, useValue: scans },
        { provide: HIT_RESEARCH_REPOSITORY, useValue: research },
      ],
    }).compile();
    accept = module.get(AcceptProposalUseCase);
    reject = module.get(RejectProposalUseCase);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create the proposed cluster with its members reasons, catalysts and sources', async () => {
    mockIds(NEW_ID, memberId('AAA'), memberId('BBB'), memberId('CCC'));

    const result = await accept.execute({ proposalId });

    expect(clusters.save).toHaveBeenNthCalledWith(
      1,
      created(NEW_ID, [member('AAA'), member('BBB'), member('CCC')]),
    );
    expect(proposals.saveDecision).toHaveBeenNthCalledWith(
      1,
      proposal({
        status: 'accepted',
        clusterIds: [ClusterId.of(NEW_ID)],
        decidedAt: NOW,
      }),
    );
    expect(result).toEqual({ clusterIds: [ClusterId.of(NEW_ID)] });
  });

  it('should create an edited cluster and mark the proposal edited', async () => {
    mockIds(NEW_ID, memberId('AAA'), memberId('CCC'), memberId('DDD'));

    await accept.execute({
      proposalId,
      edit: {
        name: 'SMR fuel chain',
        addTickers: [Symbol.of('DDD')],
        removeTickers: [Symbol.of('BBB')],
      },
    });

    expect(clusters.save).toHaveBeenNthCalledWith(
      1,
      created(
        NEW_ID,
        [
          member('AAA'),
          member('CCC'),
          member('DDD', {
            reason: null,
            catalyst: 'Won a DOE enrichment contract',
          }),
        ],
        { name: 'SMR fuel chain' },
      ),
    );
    expect(proposals.saveDecision).toHaveBeenNthCalledWith(
      1,
      proposal({
        status: 'edited',
        clusterIds: [ClusterId.of(NEW_ID)],
        decidedAt: NOW,
      }),
    );
  });

  it('should refuse an edit that adds a ticker that is not a hit of the scan', async () => {
    await expect(
      accept.execute({
        proposalId,
        edit: { addTickers: [Symbol.of('ZZZ')], removeTickers: [] },
      }),
    ).rejects.toThrow(
      new InvariantError('Not hits of the 2026-11-25 scan: ZZZ'),
    );
    expect(proposals.saveDecision).not.toHaveBeenCalled();
    expect(clusters.save).not.toHaveBeenCalled();
  });

  it('should create every cluster of the applied alternative', async () => {
    const fuel = {
      name: 'Fuel',
      description: 'Fuel only',
      sharedCatalyst: 'DOE loan program',
      sources: [],
      members: ['AAA', 'BBB', 'CCC'].map((t) => proposedMember(t)),
    };
    const reactors = { ...fuel, name: 'Reactors' };
    const withAlternative = proposal({
      content: {
        kind: 'new_cluster',
        cluster: proposedCluster({
          alternatives: [
            { kind: 'split', description: 'Two', clusters: [fuel, reactors] },
          ],
        }),
      },
    });
    proposals.findById.mockResolvedValue(withAlternative);
    mockIds(
      NEW_ID,
      memberId('AAA'),
      memberId('BBB'),
      memberId('CCC'),
      SECOND_ID,
      memberId('AAA', 1),
      memberId('BBB', 1),
      memberId('CCC', 1),
    );

    const result = await accept.execute({ proposalId, alternativeIndex: 0 });

    const members = (n: number) =>
      ['AAA', 'BBB', 'CCC'].map((t) => member(t, { id: memberId(t, n) }));
    const overrides = { description: 'Fuel only', sources: [] };
    expect(clusters.save).toHaveBeenNthCalledWith(
      1,
      created(NEW_ID, members(0), { ...overrides, name: 'Fuel' }),
    );
    expect(clusters.save).toHaveBeenNthCalledWith(
      2,
      created(SECOND_ID, members(1), { ...overrides, name: 'Reactors' }),
    );
    expect(result).toEqual({
      clusterIds: [ClusterId.of(NEW_ID), ClusterId.of(SECOND_ID)],
    });
    expect(proposals.saveDecision).toHaveBeenNthCalledWith(
      1,
      proposal({
        content: withAlternative.content,
        status: 'accepted',
        appliedAlternative: 0,
        clusterIds: [ClusterId.of(NEW_ID), ClusterId.of(SECOND_ID)],
        decidedAt: NOW,
      }),
    );
  });

  it('should refuse an alternative that does not exist', async () => {
    await expect(
      accept.execute({ proposalId, alternativeIndex: 2 }),
    ).rejects.toThrow(InvariantError);
    expect(clusters.save).not.toHaveBeenCalled();
  });

  it('should add an accepted addition to its cluster with reason and source', async () => {
    proposals.findById.mockResolvedValue(
      proposal({ content: { kind: 'addition', addition } }),
    );
    mockIds(memberId('DDD'));

    const result = await accept.execute({ proposalId });

    expect(clusters.findById).toHaveBeenNthCalledWith(
      1,
      ClusterId.of(CLUSTER_ID),
    );
    expect(clusters.save).toHaveBeenNthCalledWith(
      1,
      cluster({
        members: [
          clusterMember('AAA'),
          clusterMember('BBB'),
          clusterMember('DDD', {
            joinedAt: NOW,
            reason: 'Also an SMR fuel supplier',
            source: 'https://news.example.com/DDD',
          }),
        ],
      }),
    );
    expect(result).toEqual({ clusterIds: [ClusterId.of(CLUSTER_ID)] });
  });

  it('should refuse an addition to a closed cluster and leave the proposal pending', async () => {
    proposals.findById.mockResolvedValue(
      proposal({ content: { kind: 'addition', addition } }),
    );
    clusters.findById.mockResolvedValue(
      cluster({ status: 'closed', closedAt: NOW }),
    );

    await expect(accept.execute({ proposalId })).rejects.toThrow(
      new StateError('Cluster Nuclear is closed'),
    );
    expect(proposals.saveDecision).not.toHaveBeenCalled();
    expect(clusters.save).not.toHaveBeenCalled();
  });

  it('should refuse an addition of a ticker that is already an active member', async () => {
    proposals.findById.mockResolvedValue(
      proposal({
        content: { kind: 'addition', addition: { ...addition, ticker: 'AAA' } },
      }),
    );

    await expect(accept.execute({ proposalId })).rejects.toThrow(StateError);
    expect(proposals.saveDecision).not.toHaveBeenCalled();
  });

  it('should refuse to accept a proposal that is already decided', async () => {
    proposals.findById.mockResolvedValue(proposal({ status: 'rejected' }));

    await expect(accept.execute({ proposalId })).rejects.toThrow(
      new StateError(`Proposal ${PROPOSAL_ID} is already rejected`),
    );
    expect(clusters.save).not.toHaveBeenCalled();
  });

  it('should create no cluster when another request decided the proposal first', async () => {
    proposals.saveDecision.mockResolvedValue(false);
    mockIds(NEW_ID, memberId('AAA'), memberId('BBB'), memberId('CCC'));

    await expect(accept.execute({ proposalId })).rejects.toThrow(StateError);
    expect(clusters.save).not.toHaveBeenCalled();
  });

  it('should refuse an edit and an alternative together', async () => {
    proposals.findById.mockResolvedValue(
      proposal({
        content: {
          kind: 'new_cluster',
          cluster: proposedCluster({
            alternatives: [
              {
                kind: 'split',
                description: 'One',
                clusters: [proposedCluster({ alternatives: undefined })],
              },
            ],
          }),
        },
      }),
    );

    await expect(
      accept.execute({
        proposalId,
        alternativeIndex: 0,
        edit: { addTickers: [], removeTickers: [] },
      }),
    ).rejects.toThrow(
      new InvariantError('Accept with an edit or an alternative, not both'),
    );
    expect(proposals.saveDecision).not.toHaveBeenCalled();
    expect(clusters.save).not.toHaveBeenCalled();
  });

  it.each([
    { edit: { name: 'Renamed', addTickers: [], removeTickers: [] } },
    { alternativeIndex: 0 },
  ])('should refuse to change an addition with %j', async (change) => {
    proposals.findById.mockResolvedValue(
      proposal({ content: { kind: 'addition', addition } }),
    );

    await expect(accept.execute({ proposalId, ...change })).rejects.toThrow(
      new InvariantError('An addition is accepted as proposed'),
    );
    expect(proposals.saveDecision).not.toHaveBeenCalled();
    expect(clusters.save).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError for an unknown proposal', async () => {
    proposals.findById.mockResolvedValue(null);

    await expect(accept.execute({ proposalId })).rejects.toThrow(NotFoundError);
  });

  it('should store a rejected proposal as rejected', async () => {
    await reject.execute({ proposalId });

    expect(proposals.saveDecision).toHaveBeenNthCalledWith(
      1,
      proposal({ status: 'rejected', decidedAt: NOW }),
    );
  });

  it('should refuse to reject a proposal that is already accepted', async () => {
    proposals.findById.mockResolvedValue(proposal({ status: 'accepted' }));

    await expect(reject.execute({ proposalId })).rejects.toThrow(StateError);
    expect(proposals.saveDecision).not.toHaveBeenCalled();
  });
});
