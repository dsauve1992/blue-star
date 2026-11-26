import { UuidGeneratorService } from '../../../../shared/services/uuid-generator.service';
import { Symbol } from '../../../../shared/value-objects/symbol';
import { InvariantError, NotFoundError, StateError } from '../domain-errors';
import { ClusterId } from '../value-objects/cluster-id';
import { SessionDate } from '../value-objects/session-date';

export const MAX_CLUSTER_NAME_LENGTH = 200;
const MAX_TICKER_LENGTH = 20;

export type ClusterStatus = 'tracking' | 'closed';

export interface ClusterMember {
  id: string;
  ticker: Symbol;
  joinedAt: Date;
  reason: string | null;
  catalyst: string | null;
  source: string | null;
  removedAt: Date | null;
}

export interface NewClusterMember {
  ticker: Symbol;
  reason: string | null;
  catalyst: string | null;
  source: string | null;
}

export interface ClusterData {
  id: ClusterId;
  name: string;
  description: string;
  sharedCatalyst: string | null;
  sources: string[];
  originProposalId: string | null;
  sourceScanDate: SessionDate;
  createdAt: Date;
  status: ClusterStatus;
  closedAt: Date | null;
  members: ClusterMember[];
}

export class Cluster {
  private constructor(
    public readonly id: ClusterId,
    private _name: string,
    private _description: string,
    public readonly sharedCatalyst: string | null,
    public readonly sources: string[],
    public readonly originProposalId: string | null,
    public readonly sourceScanDate: SessionDate,
    public readonly createdAt: Date,
    private _status: ClusterStatus,
    private _closedAt: Date | null,
    private _members: ClusterMember[],
  ) {}

  static create(args: {
    name: string;
    description: string;
    sharedCatalyst: string | null;
    sources: string[];
    originProposalId: string | null;
    sourceScanDate: SessionDate;
    members: NewClusterMember[];
  }): Cluster {
    if (args.members.length === 0) {
      throw new InvariantError('A cluster needs at least one member');
    }
    const cluster = new Cluster(
      ClusterId.new(),
      Cluster.validName(args.name),
      args.description.trim(),
      args.sharedCatalyst,
      [...args.sources],
      args.originProposalId,
      args.sourceScanDate,
      new Date(),
      'tracking',
      null,
      [],
    );
    args.members.forEach((member) => cluster.addMember(member));
    return cluster;
  }

  static fromData(data: ClusterData): Cluster {
    return new Cluster(
      data.id,
      data.name,
      data.description,
      data.sharedCatalyst,
      [...data.sources],
      data.originProposalId,
      data.sourceScanDate,
      data.createdAt,
      data.status,
      data.closedAt,
      [...data.members],
    );
  }

  update(changes: { name?: string; description?: string }): void {
    if (changes.name !== undefined) {
      this._name = Cluster.validName(changes.name);
    }
    if (changes.description !== undefined) {
      this._description = changes.description.trim();
    }
  }

  addMember(member: NewClusterMember): void {
    this.assertTracking();
    if (member.ticker.value.length > MAX_TICKER_LENGTH) {
      throw new InvariantError(
        `Ticker cannot exceed ${MAX_TICKER_LENGTH} characters: ${member.ticker.value}`,
      );
    }
    if (this.activeMember(member.ticker)) {
      throw new StateError(
        `${member.ticker.value} is already an active member of cluster ${this._name}`,
      );
    }
    this._members.push({
      id: UuidGeneratorService.generate(),
      ...member,
      joinedAt: new Date(),
      removedAt: null,
    });
  }

  removeMember(ticker: Symbol): void {
    this.assertTracking();
    const member = this.activeMember(ticker);
    if (!member) {
      throw new NotFoundError(
        `${ticker.value} is not an active member of cluster ${this._name}`,
      );
    }
    const removed = { ...member, removedAt: new Date() };
    this._members = this._members.map((m) => (m === member ? removed : m));
  }

  close(): void {
    this.assertTracking();
    this._status = 'closed';
    this._closedAt = new Date();
  }

  get name(): string {
    return this._name;
  }

  get description(): string {
    return this._description;
  }

  get status(): ClusterStatus {
    return this._status;
  }

  get closedAt(): Date | null {
    return this._closedAt;
  }

  get members(): ReadonlyArray<Readonly<ClusterMember>> {
    return this._members;
  }

  private activeMember(ticker: Symbol): ClusterMember | undefined {
    return this._members.find(
      (member) => member.removedAt === null && member.ticker.equals(ticker),
    );
  }

  private assertTracking(): void {
    if (this._status === 'closed') {
      throw new StateError(`Cluster ${this._name} is closed`);
    }
  }

  private static validName(name: string): string {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new InvariantError('Cluster name cannot be empty');
    }
    if (trimmed.length > MAX_CLUSTER_NAME_LENGTH) {
      throw new InvariantError(
        `Cluster name cannot exceed ${MAX_CLUSTER_NAME_LENGTH} characters`,
      );
    }
    return trimmed;
  }
}
