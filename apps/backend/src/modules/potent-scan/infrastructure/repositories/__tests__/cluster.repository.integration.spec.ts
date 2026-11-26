import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from '../../../../../config/database.service';
import { ClusterRepository } from '../../../domain/repositories/cluster.repository.interface';
import { ClusterRepositoryImpl } from '../cluster.repository';
import {
  CLUSTER_REPOSITORY,
  MEMBER_TIER_REPOSITORY,
} from '../../../constants/tokens';
import { MemberTierRepository } from '../../../domain/repositories/member-tier.repository.interface';
import { MemberTierRepositoryImpl } from '../member-tier.repository';
import { SessionDate } from '../../../domain/value-objects/session-date';
import { MemberTier } from '../../../domain/value-objects/member-tier';
import { Tier } from '../../../domain/value-objects/potent-scan-stock';
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

// Shares potent_clusters with the suite above, so it must run in the same file (jest runs files in parallel against one database).
const tier = (
  id: string,
  date: string,
  value: Tier,
  close = 10,
  adrPct: number | null = 4.25,
): MemberTier => ({
  memberId: id,
  date: SessionDate.of(date),
  tier: value,
  close,
  ema9: 9.5,
  ema21: 9.25,
  ema50: 8.75,
  adrPct,
});

describe('MemberTierRepository Integration', () => {
  const OTHER_ID = '33333333-3333-4333-8333-333333333333';
  let module: TestingModule;
  let repository: MemberTierRepository;
  let clusters: ClusterRepository;
  let databaseService: DatabaseService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [await ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        DatabaseService,
        { provide: CLUSTER_REPOSITORY, useClass: ClusterRepositoryImpl },
        { provide: MEMBER_TIER_REPOSITORY, useClass: MemberTierRepositoryImpl },
      ],
    }).compile();

    await module.init();

    repository = module.get<MemberTierRepository>(MEMBER_TIER_REPOSITORY);
    clusters = module.get<ClusterRepository>(CLUSTER_REPOSITORY);
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  afterAll(async () => {
    if (module) await module.close();
  });

  beforeEach(async () => {
    await databaseService.query('DELETE FROM potent_member_tiers');
    await databaseService.query('DELETE FROM potent_cluster_members');
    await databaseService.query('DELETE FROM potent_clusters');
    await clusters.save(cluster());
    await clusters.save(
      cluster({
        id: ClusterId.of(OTHER_ID),
        members: [clusterMember('AAA', { id: memberId('AAA', 1) })],
      }),
    );
  });

  it("should return a cluster's tiers ordered by member and date, without other clusters' tiers", async () => {
    await repository.saveAll([
      tier(memberId('BBB'), '2026-11-25', 'Lag', 20, null),
      tier(memberId('AAA'), '2026-11-25', 'Lead', 12.5),
      tier(memberId('AAA'), '2026-11-24', 'Mediocre', 11),
      tier(memberId('AAA', 1), '2026-11-25', 'Lead'),
    ]);

    const tiers = await repository.findByCluster(ClusterId.of(CLUSTER_ID));

    expect(tiers).toEqual([
      tier(memberId('AAA'), '2026-11-24', 'Mediocre', 11),
      tier(memberId('AAA'), '2026-11-25', 'Lead', 12.5),
      tier(memberId('BBB'), '2026-11-25', 'Lag', 20, null),
    ]);
  });

  it('should overwrite the tier of a member and session already stored', async () => {
    await repository.saveAll([tier(memberId('AAA'), '2026-11-25', 'Lag', 10)]);

    await repository.saveAll([tier(memberId('AAA'), '2026-11-25', 'Lead', 11)]);

    expect(await repository.findByCluster(ClusterId.of(CLUSTER_ID))).toEqual([
      tier(memberId('AAA'), '2026-11-25', 'Lead', 11),
    ]);
  });

  it('should count Lead, Mediocre and Lag members per cluster and session', async () => {
    await repository.saveAll([
      tier(memberId('AAA'), '2026-11-24', 'Mediocre'),
      tier(memberId('BBB'), '2026-11-24', 'Mediocre'),
      tier(memberId('AAA'), '2026-11-25', 'Lead'),
      tier(memberId('BBB'), '2026-11-25', 'Lag'),
      tier(memberId('AAA', 1), '2026-11-25', 'Lead'),
    ]);

    const counts = await repository.dailyCountsByCluster([
      ClusterId.of(CLUSTER_ID),
      ClusterId.of(OTHER_ID),
    ]);

    expect(counts).toEqual(
      new Map([
        [
          CLUSTER_ID,
          [
            {
              date: SessionDate.of('2026-11-24'),
              lead: 0,
              mediocre: 2,
              lag: 0,
            },
            {
              date: SessionDate.of('2026-11-25'),
              lead: 1,
              mediocre: 0,
              lag: 1,
            },
          ],
        ],
        [
          OTHER_ID,
          [
            {
              date: SessionDate.of('2026-11-25'),
              lead: 1,
              mediocre: 0,
              lag: 0,
            },
          ],
        ],
      ]),
    );
  });

  it('should count a ticker removed and re-added in the same session once', async () => {
    const readded = memberId('AAA', 2);
    await databaseService.query(
      `UPDATE potent_cluster_members SET removed_at = NOW() WHERE id = $1`,
      [memberId('AAA')],
    );
    await databaseService.query(
      `INSERT INTO potent_cluster_members (id, cluster_id, ticker, joined_at)
       VALUES ($1, $2, 'AAA', NOW())`,
      [readded, CLUSTER_ID],
    );
    await repository.saveAll([
      tier(memberId('AAA'), '2026-11-25', 'Lead'),
      tier(readded, '2026-11-25', 'Lead'),
      tier(memberId('BBB'), '2026-11-25', 'Lag'),
    ]);

    const counts = await repository.dailyCountsByCluster([
      ClusterId.of(CLUSTER_ID),
    ]);

    expect(counts).toEqual(
      new Map([
        [
          CLUSTER_ID,
          [
            {
              date: SessionDate.of('2026-11-25'),
              lead: 1,
              mediocre: 0,
              lag: 1,
            },
          ],
        ],
      ]),
    );
  });

  it("should count only active Lead members on each cluster's latest tier date", async () => {
    await repository.saveAll([
      tier(memberId('AAA'), '2026-11-24', 'Lead'),
      tier(memberId('BBB'), '2026-11-24', 'Lead'),
      tier(memberId('AAA'), '2026-11-25', 'Lag'),
      tier(memberId('BBB'), '2026-11-25', 'Lead'),
      tier(memberId('AAA', 1), '2026-11-24', 'Lead'),
    ]);
    await databaseService.query(
      `UPDATE potent_cluster_members SET removed_at = NOW() WHERE id = $1`,
      [memberId('AAA', 1)],
    );

    const counts = await repository.activeLeadCountsOnLatestDate([
      ClusterId.of(CLUSTER_ID),
      ClusterId.of(OTHER_ID),
    ]);

    expect(counts).toEqual(
      new Map([
        [CLUSTER_ID, 1],
        [OTHER_ID, 0],
      ]),
    );
  });

  it('should return no counts for clusters without tiers', async () => {
    expect(
      await repository.dailyCountsByCluster([ClusterId.of(CLUSTER_ID)]),
    ).toEqual(new Map());
  });
});
