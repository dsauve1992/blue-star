import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Alert,
  AlertDescription,
  Card,
  LoadingSpinner,
} from "src/global/design-system";
import type { Cluster, ClusterStatus } from "../api/potent-scan.client";
import { useClusters } from "../hooks/use-clusters";
import { activeMembers } from "../utils/cluster-members";
import { formatTimestampDate } from "../utils/format";
import { ClusterCardGrid } from "./ClusterCardGrid";
import { LeadShareSparkline } from "./LeadShareSparkline";
import { SegmentedControl } from "./SegmentedControl";

const STATUSES: { id: ClusterStatus; label: string }[] = [
  { id: "tracking", label: "Tracking" },
  { id: "closed", label: "Closed" },
];

type ClustersView = "table" | "cards";

const VIEWS: { id: ClustersView; label: string }[] = [
  { id: "table", label: "Table" },
  { id: "cards", label: "Cards" },
];

const VIEW_STORAGE_KEY = "potent-scan.clusters-view";

const storedView = (): ClustersView =>
  localStorage.getItem(VIEW_STORAGE_KEY) === "cards" ? "cards" : "table";

const HEADER_CLASS =
  "px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400";

const activeMemberCount = (cluster: Cluster) => activeMembers(cluster).length;

const removedMemberCount = (cluster: Cluster) =>
  cluster.members.length - activeMemberCount(cluster);

export function ClustersTab() {
  const [status, setStatus] = useState<ClusterStatus>("tracking");
  const [view, setView] = useState<ClustersView>(storedView);
  const clusters = useClusters(status);
  const navigate = useNavigate();
  const changeView = (next: ClustersView) => {
    localStorage.setItem(VIEW_STORAGE_KEY, next);
    setView(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          label="Cluster status"
          options={STATUSES}
          value={status}
          onChange={setStatus}
        />
        <SegmentedControl
          label="View"
          options={VIEWS}
          value={view}
          onChange={changeView}
        />
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
      {clusters.data && clusters.data.length > 0 && view === "cards" && (
        <ClusterCardGrid clusters={clusters.data} />
      )}
      {clusters.data && clusters.data.length > 0 && view === "table" && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm text-slate-900 dark:text-slate-100">
            <thead className="bg-slate-50 dark:bg-slate-900/40">
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
                  className="cursor-pointer border-t border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/40"
                >
                  <td className="px-4 py-2 font-medium">
                    <Link
                      to={`/potent-scan/clusters/${cluster.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="hover:underline"
                    >
                      {cluster.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                    {formatTimestampDate(cluster.createdAt)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {activeMemberCount(cluster)}
                    {removedMemberCount(cluster) > 0 && (
                      <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
                        (+{removedMemberCount(cluster)} removed)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {cluster.leadCount} / {activeMemberCount(cluster)}
                  </td>
                  <td className="px-4 py-2">
                    <LeadShareSparkline points={cluster.leadShare} />
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    {cluster.leadShare.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
