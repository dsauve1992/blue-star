import { Link } from "react-router";
import { Badge } from "src/global/design-system";
import type { ProposalStatus } from "../api/potent-scan.client";

const STATUS_BADGE = {
  pending: { variant: "outline", label: "Pending" },
  accepted: { variant: "success", label: "Accepted" },
  edited: { variant: "success", label: "Edited & accepted" },
  rejected: { variant: "secondary", label: "Rejected" },
} as const;

export function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
  const { variant, label } = STATUS_BADGE[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export interface CreatedClusterLink {
  id: string;
  name: string;
}

export function CreatedClusterLinks({
  clusters,
}: {
  clusters: CreatedClusterLink[];
}) {
  if (clusters.length === 0) return null;
  return (
    <span className="flex flex-wrap items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
      →
      {clusters.map((cluster) => (
        <Link
          key={cluster.id}
          to={`/potent-scan/clusters/${cluster.id}`}
          className="font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          {cluster.name}
        </Link>
      ))}
    </span>
  );
}
