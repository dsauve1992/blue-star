import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Alert,
  AlertDescription,
  LoadingSpinner,
  cn,
} from "src/global/design-system";
import type { Cluster, ClusterStatus } from "../api/potent-scan.client";
import { useClusters } from "../hooks/use-clusters";
import { formatTimestampDate } from "../utils/format";
import { LeadShareSparkline } from "./LeadShareSparkline";

const STATUSES: { id: ClusterStatus; label: string }[] = [
  { id: "tracking", label: "Tracking" },
  { id: "closed", label: "Closed" },
];

const HEADER_CLASS =
  "p-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400";

const activeMemberCount = (cluster: Cluster) =>
  cluster.members.filter((member) => member.removedAt === null).length;

const removedMemberCount = (cluster: Cluster) =>
  cluster.members.length - activeMemberCount(cluster);

export function ClustersTab() {
  const [status, setStatus] = useState<ClusterStatus>("tracking");
  const clusters = useClusters(status);
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div
        role="radiogroup"
        aria-label="Cluster status"
        className="inline-flex rounded-md border border-slate-200 p-0.5 dark:border-slate-700"
      >
        {STATUSES.map((option) => (
          <button
            key={option.id}
            role="radio"
            aria-checked={status === option.id}
            onClick={() => setStatus(option.id)}
            className={cn(
              "rounded border-0 px-3 py-1 text-sm font-medium transition-colors duration-150",
              status === option.id
                ? "bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-50"
                : "bg-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {clusters.isLoading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      )}
      {clusters.error && (
        <Alert variant="danger">
          <AlertDescription>
            Couldn't load clusters: {clusters.error.message}
          </AlertDescription>
        </Alert>
      )}
      {clusters.data && clusters.data.length === 0 && (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No {status === "tracking" ? "tracked" : "closed"} clusters.
        </p>
      )}
      {clusters.data && clusters.data.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm text-slate-900 dark:text-slate-100">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className={`${HEADER_CLASS} text-left`}>Name</th>
                <th className={`${HEADER_CLASS} text-left`}>Created</th>
                <th className={`${HEADER_CLASS} text-right`}>Members</th>
                <th className={`${HEADER_CLASS} text-right`}>Lead / active</th>
                <th className={`${HEADER_CLASS} text-left`}>Lead share</th>
                <th
                  className={`${HEADER_CLASS} text-right`}
                  title="Sessions with tier data, starting at the session before the first member joined"
                >
                  Days tracked
                </th>
              </tr>
            </thead>
            <tbody>
              {clusters.data.map((cluster) => (
                <tr
                  key={cluster.id}
                  onClick={() =>
                    navigate(`/potent-scan/clusters/${cluster.id}`)
                  }
                  className="cursor-pointer border-t border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60"
                >
                  <td className="p-2 font-medium">
                    <Link
                      to={`/potent-scan/clusters/${cluster.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="hover:underline"
                    >
                      {cluster.name}
                    </Link>
                  </td>
                  <td className="p-2 text-slate-700 dark:text-slate-300">
                    {formatTimestampDate(cluster.createdAt)}
                  </td>
                  <td className="p-2 text-right font-mono tabular-nums">
                    {activeMemberCount(cluster)}
                    {removedMemberCount(cluster) > 0 && (
                      <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
                        (+{removedMemberCount(cluster)} removed)
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-right font-mono tabular-nums">
                    {cluster.leadCount} / {activeMemberCount(cluster)}
                  </td>
                  <td className="p-2">
                    <LeadShareSparkline points={cluster.leadShare} />
                  </td>
                  <td className="p-2 text-right font-mono tabular-nums">
                    {cluster.leadShare.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
