import { Test } from '@nestjs/testing';
import { PROPOSAL_REPOSITORY } from '../constants/tokens';
import type { ProposalRepository } from '../domain/repositories/proposal.repository.interface';
import { ClusterId } from '../domain/value-objects/cluster-id';
import { ProposalId } from '../domain/value-objects/proposal-id';
import { SessionDate } from '../domain/value-objects/session-date';
import {
  CLUSTER_ID,
  JOINED_AT,
  PROPOSAL_ID,
  proposal,
  proposedCluster,
} from '../test/fixtures';
import { GetProposalsUseCase } from './get-proposals.use-case';

describe('GetProposalsUseCase', () => {
  const SCAN_DATE = SessionDate.of('2026-11-25');
  const OTHER_ID = '77777777-7777-4777-8777-777777777777';
  const DECIDED_AT = new Date('2026-11-27T15:00:00.000Z');
  const addition = {
    existingClusterId: CLUSTER_ID,
    existingClusterName: 'Nuclear',
    ticker: 'EEE',
    reason: 'Also SMR',
    source: null,
  };
  let repository: jest.Mocked<ProposalRepository>;
  let useCase: GetProposalsUseCase;

  beforeEach(async () => {
    repository = {
      replacePending: jest.fn(),
      recordRun: jest.fn(),
      saveDecision: jest.fn(),
      findById: jest.fn(),
      findByScanDate: jest.fn().mockResolvedValue([
        proposal({
          status: 'accepted',
          clusterIds: [ClusterId.of(CLUSTER_ID)],
          decidedAt: DECIDED_AT,
        }),
        proposal({
          id: ProposalId.of(OTHER_ID),
          content: { kind: 'addition', addition },
        }),
      ]),
      findLatestSucceededRun: jest.fn().mockResolvedValue({
        scanDate: SCAN_DATE,
        status: 'succeeded',
        model: 'claude-sonnet-5-5',
        proposalCount: 2,
        unclustered: [{ ticker: 'DDD', reason: 'Own earnings beat' }],
        dropped: ['Unclustered ZZZ: not a hit'],
        usage: {
          inputTokens: 20000,
          outputTokens: 3000,
          webSearchRequests: 0,
          costUsd: 0.07,
        },
        error: null,
        startedAt: JOINED_AT,
        finishedAt: JOINED_AT,
      }),
    };
    const module = await Test.createTestingModule({
      providers: [
        GetProposalsUseCase,
        { provide: PROPOSAL_REPOSITORY, useValue: repository },
      ],
    }).compile();
    useCase = module.get(GetProposalsUseCase);
  });

  it('should group proposals by kind with their decisions, the unclustered hits and the run', async () => {
    const result = await useCase.execute({ sessionDate: SCAN_DATE });

    expect(result).toEqual({
      scanDate: '2026-11-25',
      run: {
        model: 'claude-sonnet-5-5',
        finishedAt: JOINED_AT.toISOString(),
        inputTokens: 20000,
        outputTokens: 3000,
        costUsd: 0.07,
        dropped: ['Unclustered ZZZ: not a hit'],
      },
      newClusters: [
        {
          id: PROPOSAL_ID,
          status: 'accepted',
          appliedAlternative: null,
          clusterIds: [CLUSTER_ID],
          createdAt: JOINED_AT.toISOString(),
          decidedAt: DECIDED_AT.toISOString(),
          ...proposedCluster(),
        },
      ],
      additions: [
        {
          id: OTHER_ID,
          status: 'pending',
          appliedAlternative: null,
          clusterIds: [],
          createdAt: JOINED_AT.toISOString(),
          decidedAt: null,
          ...addition,
        },
      ],
      unclustered: [{ ticker: 'DDD', reason: 'Own earnings beat' }],
    });
  });

  it('should return no run and no unclustered hits before any successful run', async () => {
    repository.findByScanDate.mockResolvedValue([]);
    repository.findLatestSucceededRun.mockResolvedValue(null);

    expect(await useCase.execute({ sessionDate: SCAN_DATE })).toEqual({
      scanDate: '2026-11-25',
      run: null,
      newClusters: [],
      additions: [],
      unclustered: [],
    });
  });
});
