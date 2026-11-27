import type { Cluster, ClusterMember } from "../api/potent-scan.client";

export const activeMembers = (cluster: Cluster): ClusterMember[] =>
  cluster.members.filter((member) => member.removedAt === null);
