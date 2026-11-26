import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from '../../../../../config/database.service';
import { ProposalRepository } from '../../../domain/repositories/proposal.repository.interface';
import { ProposalRepositoryImpl } from '../proposal.repository';
import { PROPOSAL_REPOSITORY } from '../../../constants/tokens';
import { ProposalRun } from '../../../domain/value-objects/cluster-proposal';
import { ClusterId } from '../../../domain/value-objects/cluster-id';
import { ProposalId } from '../../../domain/value-objects/proposal-id';
import { SessionDate } from '../../../domain/value-objects/session-date';
import {
  CLUSTER_ID,
  JOINED_AT,
  PROPOSAL_ID,
  proposal,
  proposedCluster,
} from '../../../test/fixtures';

describe('ProposalRepository Integration', () => {
  let module: TestingModule;
  let repository: ProposalRepository;
  let databaseService: DatabaseService;

  const SCAN_DATE = SessionDate.of('2026-11-25');
  const OTHER_ID = '77777777-7777-4777-8777-777777777777';
  const THIRD_ID = '88888888-8888-4888-8888-888888888888';
  const DECIDED_AT = new Date('2026-11-27T15:00:00.000Z');

  const run = (overrides: Partial<ProposalRun> = {}): ProposalRun => ({
    scanDate: SCAN_DATE,
    status: 'succeeded',
    model: 'claude-sonnet-5-5',
    proposalCount: 2,
    unclustered: [{ ticker: 'DDD', reason: 'Own earnings beat' }],
    dropped: ['Cluster "Too small": 2 valid member(s), needs 3'],
    usage: {
      inputTokens: 20000,
      outputTokens: 3000,
      webSearchRequests: 0,
      costUsd: 0.07,
    },
    error: null,
    startedAt: JOINED_AT,
    finishedAt: JOINED_AT,
    ...overrides,
  });

  const newCluster = proposal({
    content: {
      kind: 'new_cluster',
      cluster: proposedCluster({
        alternatives: [
          {
            kind: 'split',
            description: 'Two',
            clusters: [proposedCluster({ alternatives: undefined })],
          },
        ],
      }),
    },
  });
  const addition = proposal({
    id: ProposalId.of(OTHER_ID),
    content: {
      kind: 'addition',
      addition: {
        existingClusterId: CLUSTER_ID,
        existingClusterName: 'Nuclear',
        ticker: 'EEE',
        reason: 'Also SMR',
        source: null,
      },
    },
  });

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [await ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        DatabaseService,
        { provide: PROPOSAL_REPOSITORY, useClass: ProposalRepositoryImpl },
      ],
    }).compile();
    await module.init();
    repository = module.get<ProposalRepository>(PROPOSAL_REPOSITORY);
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  afterAll(async () => {
    if (module) await module.close();
  });

  beforeEach(async () => {
    await databaseService.query('DELETE FROM potent_proposals');
    await databaseService.query('DELETE FROM potent_proposal_runs');
  });

  it('should round-trip proposals of both kinds with the run', async () => {
    await repository.replacePending([newCluster, addition], run());

    expect(await repository.findByScanDate(SCAN_DATE)).toEqual([
      newCluster,
      addition,
    ]);
    expect(await repository.findById(ProposalId.of(OTHER_ID))).toEqual(
      addition,
    );
    expect(await repository.findLatestSucceededRun(SCAN_DATE)).toEqual(run());
  });

  it('should replace pending proposals and keep decided ones on a rerun', async () => {
    await repository.replacePending([proposal(), addition], run());
    const rejected = proposal({ status: 'rejected', decidedAt: DECIDED_AT });
    expect(await repository.saveDecision(rejected)).toBe(true);
    const fresh = proposal({ id: ProposalId.of(THIRD_ID) });

    await repository.replacePending([fresh], run({ proposalCount: 1 }));

    expect(await repository.findByScanDate(SCAN_DATE)).toEqual([
      rejected,
      fresh,
    ]);
  });

  it('should store a decision with its clusters only while the proposal is pending', async () => {
    await repository.replacePending([proposal()], run());
    const accepted = proposal({
      status: 'accepted',
      appliedAlternative: 0,
      clusterIds: [ClusterId.of(CLUSTER_ID)],
      decidedAt: DECIDED_AT,
    });

    expect(await repository.saveDecision(accepted)).toBe(true);
    expect(
      await repository.saveDecision(
        proposal({ status: 'rejected', decidedAt: DECIDED_AT }),
      ),
    ).toBe(false);
    expect(await repository.findById(ProposalId.of(PROPOSAL_ID))).toEqual(
      accepted,
    );
  });

  it('should return the latest succeeded run, ignoring failures', async () => {
    await repository.replacePending([], run());
    await repository.recordRun(
      run({
        status: 'failed',
        proposalCount: 0,
        unclustered: [],
        dropped: [],
        error: 'refusal',
        finishedAt: DECIDED_AT,
      }),
    );

    expect(await repository.findLatestSucceededRun(SCAN_DATE)).toEqual(run());
    expect(
      await repository.findLatestSucceededRun(SessionDate.of('2026-11-26')),
    ).toBeNull();
  });
});
