import { UuidGeneratorService } from '../../../../shared/services/uuid-generator.service';
import { Symbol } from '../../../../shared/value-objects/symbol';
import { InvariantError, NotFoundError, StateError } from '../domain-errors';
import { ClusterId } from '../value-objects/cluster-id';
import { SessionDate } from '../value-objects/session-date';
import { Cluster } from './cluster';

const CLUSTER_ID = '11111111-1111-4111-8111-111111111111';
const CREATED_AT = new Date('2026-11-26T22:00:00.000Z');
const LATER = new Date('2026-11-27T15:00:00.000Z');

const member = (ticker: string) => ({
  ticker: Symbol.of(ticker),
  reason: null,
  catalyst: null,
  source: null,
});

describe('Cluster', () => {
  let cluster: Cluster;

  beforeEach(() => {
    jest.useFakeTimers({ now: CREATED_AT });
    jest
      .spyOn(UuidGeneratorService, 'generate')
      .mockReset()
      .mockReturnValueOnce(CLUSTER_ID)
      .mockReturnValueOnce('m-aaa')
      .mockReturnValueOnce('m-bbb')
      .mockReturnValueOnce('m-new');
    cluster = Cluster.create({
      name: '  Nuclear  ',
      description: 'SMR names ',
      sharedCatalyst: null,
      sources: [],
      originProposalId: null,
      sourceScanDate: SessionDate.of('2026-11-25'),
      members: [member('AAA'), member('BBB')],
    });
    jest.setSystemTime(LATER);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create a tracking cluster with its members joined now', () => {
    expect(cluster).toEqual(
      Cluster.fromData({
        id: ClusterId.of(CLUSTER_ID),
        name: 'Nuclear',
        description: 'SMR names',
        sharedCatalyst: null,
        sources: [],
        originProposalId: null,
        sourceScanDate: SessionDate.of('2026-11-25'),
        createdAt: CREATED_AT,
        status: 'tracking',
        closedAt: null,
        members: [
          {
            id: 'm-aaa',
            ...member('AAA'),
            joinedAt: CREATED_AT,
            removedAt: null,
          },
          {
            id: 'm-bbb',
            ...member('BBB'),
            joinedAt: CREATED_AT,
            removedAt: null,
          },
        ],
      }),
    );
  });

  it('should reject a cluster without members', () => {
    expect(() =>
      Cluster.create({
        name: 'Empty',
        description: '',
        sharedCatalyst: null,
        sources: [],
        originProposalId: null,
        sourceScanDate: SessionDate.of('2026-11-25'),
        members: [],
      }),
    ).toThrow(InvariantError);
  });

  it('should reject a blank name', () => {
    expect(() => cluster.update({ name: '   ' })).toThrow(InvariantError);
  });

  it('should reject a blank name on create', () => {
    expect(() =>
      Cluster.create({
        name: ' ',
        description: '',
        sharedCatalyst: null,
        sources: [],
        originProposalId: null,
        sourceScanDate: SessionDate.of('2026-11-25'),
        members: [member('CCC')],
      }),
    ).toThrow(new InvariantError('Cluster name cannot be empty'));
  });

  it('should reject a name longer than 200 characters', () => {
    expect(() => cluster.update({ name: 'N'.repeat(201) })).toThrow(
      new InvariantError('Cluster name cannot exceed 200 characters'),
    );
  });

  it('should reject a ticker longer than 20 characters', () => {
    expect(() => cluster.addMember(member('A'.repeat(21)))).toThrow(
      InvariantError,
    );
  });

  it('should reject a ticker that is already an active member', () => {
    expect(() => cluster.addMember(member('aaa'))).toThrow(
      new StateError('AAA is already an active member of cluster Nuclear'),
    );
  });

  it('should reject duplicate tickers on create', () => {
    expect(() =>
      Cluster.create({
        name: 'Dup',
        description: '',
        sharedCatalyst: null,
        sources: [],
        originProposalId: null,
        sourceScanDate: SessionDate.of('2026-11-25'),
        members: [member('CCC'), member('CCC')],
      }),
    ).toThrow(StateError);
  });

  it('should soft-remove a member by setting removedAt and keeping it', () => {
    cluster.removeMember(Symbol.of('AAA'));

    expect(cluster.members).toEqual([
      { id: 'm-aaa', ...member('AAA'), joinedAt: CREATED_AT, removedAt: LATER },
      { id: 'm-bbb', ...member('BBB'), joinedAt: CREATED_AT, removedAt: null },
    ]);
  });

  it('should reject removing a ticker that is not an active member', () => {
    cluster.removeMember(Symbol.of('AAA'));

    expect(() => cluster.removeMember(Symbol.of('AAA'))).toThrow(NotFoundError);
  });

  it('should re-add a removed ticker as a new membership and keep the old one', () => {
    cluster.removeMember(Symbol.of('AAA'));
    cluster.addMember(member('AAA'));

    expect(cluster.members).toEqual([
      { id: 'm-aaa', ...member('AAA'), joinedAt: CREATED_AT, removedAt: LATER },
      { id: 'm-bbb', ...member('BBB'), joinedAt: CREATED_AT, removedAt: null },
      { id: 'm-new', ...member('AAA'), joinedAt: LATER, removedAt: null },
    ]);
  });

  it('should close the cluster', () => {
    cluster.close();

    expect(cluster.status).toBe('closed');
    expect(cluster.closedAt).toEqual(LATER);
  });

  it('should reject adding a member to a closed cluster', () => {
    cluster.close();

    expect(() => cluster.addMember(member('CCC'))).toThrow(
      new StateError('Cluster Nuclear is closed'),
    );
  });

  it('should reject removing a member from a closed cluster', () => {
    cluster.close();

    expect(() => cluster.removeMember(Symbol.of('AAA'))).toThrow(
      new StateError('Cluster Nuclear is closed'),
    );
  });

  it('should reject closing an already closed cluster', () => {
    cluster.close();

    expect(() => cluster.close()).toThrow(StateError);
  });

  it('should rename and redescribe, also once closed', () => {
    cluster.close();
    cluster.update({ name: 'Uranium', description: 'Fuel cycle' });

    expect(cluster.name).toBe('Uranium');
    expect(cluster.description).toBe('Fuel cycle');
  });

  it('should keep the description when only the name changes', () => {
    cluster.update({ name: 'Uranium' });

    expect(cluster.description).toBe('SMR names');
  });
});
