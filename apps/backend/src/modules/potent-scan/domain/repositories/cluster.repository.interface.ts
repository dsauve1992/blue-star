import { Cluster, ClusterStatus } from '../entities/cluster';
import { ClusterId } from '../value-objects/cluster-id';

export interface ClusterRepository {
  save(cluster: Cluster): Promise<void>;
  findById(id: ClusterId): Promise<Cluster | null>;
  findAll(status?: ClusterStatus): Promise<Cluster[]>;
}
