import { Symbol } from '../../../../shared/value-objects/symbol';
import { InvariantError, StateError } from '../domain-errors';
import {
  NewClusterProposal,
  ProposedAddition,
  ProposedCluster,
} from '../value-objects/cluster-proposal';
import { ClusterId } from '../value-objects/cluster-id';
import { ProposalId } from '../value-objects/proposal-id';
import { SessionDate } from '../value-objects/session-date';
import { Cluster, NewClusterMember } from './cluster';

export type ProposalStatus = 'pending' | 'accepted' | 'edited' | 'rejected';

export type ProposalContent =
  | { kind: 'new_cluster'; cluster: NewClusterProposal }
  | { kind: 'addition'; addition: ProposedAddition };

export interface ProposalEdit {
  name?: string;
  description?: string;
  removeTickers: Symbol[];
  addMembers: NewClusterMember[];
}

export interface ProposalData {
  id: ProposalId;
  scanDate: SessionDate;
  content: ProposalContent;
  status: ProposalStatus;
  appliedAlternative: number | null;
  clusterIds: ClusterId[];
  createdAt: Date;
  decidedAt: Date | null;
}

export class Proposal {
  private constructor(
    public readonly id: ProposalId,
    public readonly scanDate: SessionDate,
    public readonly content: ProposalContent,
    private _status: ProposalStatus,
    private _appliedAlternative: number | null,
    private _clusterIds: ClusterId[],
    public readonly createdAt: Date,
    private _decidedAt: Date | null,
  ) {}

  static propose(scanDate: SessionDate, content: ProposalContent): Proposal {
    return new Proposal(
      ProposalId.new(),
      scanDate,
      content,
      'pending',
      null,
      [],
      new Date(),
      null,
    );
  }

  static fromData(data: ProposalData): Proposal {
    return new Proposal(
      data.id,
      data.scanDate,
      data.content,
      data.status,
      data.appliedAlternative,
      [...data.clusterIds],
      data.createdAt,
      data.decidedAt,
    );
  }

  accept(): Cluster[] {
    const clusters = [this.clusterFrom(this.proposedCluster())];
    this.decide('accepted', clusters);
    return clusters;
  }

  acceptEdited(edit: ProposalEdit): Cluster {
    const proposed = this.proposedCluster();
    const removed = edit.removeTickers.map((ticker) => ticker.value);
    const unknown = removed.filter(
      (ticker) => !proposed.members.some((member) => member.ticker === ticker),
    );
    if (unknown.length > 0) {
      throw new InvariantError(
        `Not members of the proposal: ${unknown.join(', ')}`,
      );
    }
    const kept = this.membersOf(proposed).filter(
      (member) => !removed.includes(member.ticker.value),
    );
    const cluster = Cluster.create({
      name: edit.name ?? proposed.name,
      description: edit.description ?? proposed.description,
      sharedCatalyst: proposed.sharedCatalyst,
      sources: proposed.sources,
      originProposalId: this.id.value,
      sourceScanDate: this.scanDate,
      members: [...kept, ...edit.addMembers],
    });
    this.decide('edited', [cluster]);
    return cluster;
  }

  applyAlternative(index: number): Cluster[] {
    const alternative = this.proposedCluster().alternatives[index];
    if (!alternative) {
      throw new InvariantError(
        `Proposal ${this.id.value} has no alternative ${index}`,
      );
    }
    const clusters = alternative.clusters.map((cluster) =>
      this.clusterFrom(cluster),
    );
    this.decide('accepted', clusters);
    this._appliedAlternative = index;
    return clusters;
  }

  acceptAddition(cluster: Cluster): void {
    const addition = this.addition();
    if (cluster.id.value !== addition.existingClusterId) {
      throw new InvariantError(
        `Proposal ${this.id.value} adds to cluster ${addition.existingClusterId}`,
      );
    }
    this.assertPending();
    cluster.addMember({
      ticker: Symbol.of(addition.ticker),
      reason: addition.reason,
      catalyst: null,
      source: addition.source,
    });
    this.decide('accepted', [cluster]);
  }

  reject(): void {
    this.assertPending();
    this._status = 'rejected';
    this._decidedAt = new Date();
  }

  get status(): ProposalStatus {
    return this._status;
  }

  get appliedAlternative(): number | null {
    return this._appliedAlternative;
  }

  get clusterIds(): ReadonlyArray<ClusterId> {
    return this._clusterIds;
  }

  get decidedAt(): Date | null {
    return this._decidedAt;
  }

  addition(): ProposedAddition {
    if (this.content.kind !== 'addition') {
      throw new InvariantError(
        `Proposal ${this.id.value} is not an addition to a tracked cluster`,
      );
    }
    return this.content.addition;
  }

  private proposedCluster(): NewClusterProposal {
    if (this.content.kind !== 'new_cluster') {
      throw new InvariantError(
        `Proposal ${this.id.value} is not a new cluster`,
      );
    }
    this.assertPending();
    return this.content.cluster;
  }

  private clusterFrom(proposed: ProposedCluster): Cluster {
    return Cluster.create({
      name: proposed.name,
      description: proposed.description,
      sharedCatalyst: proposed.sharedCatalyst,
      sources: proposed.sources,
      originProposalId: this.id.value,
      sourceScanDate: this.scanDate,
      members: this.membersOf(proposed),
    });
  }

  private membersOf(proposed: ProposedCluster): NewClusterMember[] {
    return proposed.members.map((member) => ({
      ticker: Symbol.of(member.ticker),
      reason: member.reason,
      catalyst: member.catalystToday,
      source: member.source,
    }));
  }

  private decide(status: ProposalStatus, clusters: Cluster[]): void {
    this._status = status;
    this._clusterIds = clusters.map((cluster) => cluster.id);
    this._decidedAt = new Date();
  }

  private assertPending(): void {
    if (this._status !== 'pending') {
      throw new StateError(
        `Proposal ${this.id.value} is already ${this._status}`,
      );
    }
  }
}
