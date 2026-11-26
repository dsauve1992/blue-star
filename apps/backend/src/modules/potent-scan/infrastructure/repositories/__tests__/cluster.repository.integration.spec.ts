import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from '../../../../../config/database.service';
import { ClusterRepository } from '../../../domain/repositories/cluster.repository.interface';
import { ClusterRepositoryImpl } from '../cluster.repository';
import { CLUSTER_REPOSITORY } from '../../../constants/tokens';
import { ClusterId } from '../../../domain/value-objects/cluster-id';
import {
  cluster,
  clusterMember,
  CLUSTER_ID,
  memberId,
} from '../../../test/fixtures';

describe('ClusterRepository Integration', () => {
  let module: TestingModule;
  let repository: ClusterRepository;
  let databaseService: DatabaseService;

  const OTHER_ID = '33333333-3333-4333-8333-333333333333';
  const REMOVED_AT = new Date('2026-11-27T15:00:00.000Z');
  const CLOSED_AT = new Date('2026-11-28T15:00:00.000Z');

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [await ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        DatabaseService,
        { provide: CLUSTER_REPOSITORY, useClass: ClusterRepositoryImpl },
      ],
    }).compile();

    await module.init();

    repository = module.get<ClusterRepository>(CLUSTER_REPOSITORY);
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  afterAll(async () => {
    if (module) await module.close();
  });

  beforeEach(async () => {
    await databaseService.query('DELETE FROM potent_cluster_members');
    await databaseService.query('DELETE FROM potent_clusters');
  });

  it('should return null for an unknown cluster', async () => {
    expect(await repository.findById(ClusterId.of(CLUSTER_ID))).toBeNull();
  });

  it('should round-trip a cluster with every field', async () => {
    const saved = cluster({
      sharedCatalyst: 'DOE loan program',
      sources: ['https://a.example', 'https://b.example'],
      originProposalId: '22222222-2222-4222-8222-222222222222',
      members: [
        clusterMember('AAA', { reason: 'r', catalyst: 'c', source: 's' }),
        clusterMember('BBB'),
      ],
    });

    await repository.save(saved);

    expect(await repository.findById(ClusterId.of(CLUSTER_ID))).toEqual(saved);
  });

  it('should keep a removed membership beside a re-added one', async () => {
    await repository.save(cluster());

    await repository.save(
      cluster({
        name: 'Uranium',
        status: 'closed',
        closedAt: CLOSED_AT,
        members: [
          clusterMember('AAA', { removedAt: REMOVED_AT }),
          clusterMember('BBB'),
          clusterMember('AAA', {
            id: memberId('AAA', 1),
            joinedAt: REMOVED_AT,
          }),
        ],
      }),
    );

    expect(await repository.findById(ClusterId.of(CLUSTER_ID))).toEqual(
      cluster({
        name: 'Uranium',
        status: 'closed',
        closedAt: CLOSED_AT,
        members: [
          clusterMember('AAA', { removedAt: REMOVED_AT }),
          clusterMember('BBB'),
          clusterMember('AAA', {
            id: memberId('AAA', 1),
            joinedAt: REMOVED_AT,
          }),
        ],
      }),
    );
  });

  it('should reject two active memberships of the same ticker', async () => {
    await expect(
      repository.save(
        cluster({
          members: [
            clusterMember('AAA'),
            clusterMember('AAA', { id: memberId('AAA', 1) }),
          ],
        }),
      ),
    ).rejects.toMatchObject({
      code: '23505',
      constraint: 'idx_potent_cluster_members_active_ticker',
    });
    expect(await repository.findById(ClusterId.of(CLUSTER_ID))).toBeNull();
  });

  it('should filter clusters by status', async () => {
    await repository.save(cluster());
    await repository.save(
      cluster({
        id: ClusterId.of(OTHER_ID),
        status: 'closed',
        closedAt: CLOSED_AT,
        members: [clusterMember('CCC', { id: memberId('CCC') })],
      }),
    );

    const tracking = await repository.findAll('tracking');
    const closed = await repository.findAll('closed');
    const all = await repository.findAll();

    expect(tracking.map((c) => c.id)).toEqual([ClusterId.of(CLUSTER_ID)]);
    expect(closed.map((c) => c.id)).toEqual([ClusterId.of(OTHER_ID)]);
    expect(all).toHaveLength(2);
  });
});
