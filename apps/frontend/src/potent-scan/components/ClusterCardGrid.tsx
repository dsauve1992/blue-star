import { Link } from "react-router";
import { Badge, Card } from "src/global/design-system";
import type { Cluster } from "../api/potent-scan.client";
import { activeMembers } from "../utils/cluster-members";
import { formatTimestampDate } from "../utils/format";
import { ClusterProgressionSparkline } from "./ClusterProgressionSparkline";

const MAX_TICKERS = 10;

const LABEL_CLASS =
  "text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400";

function ClusterCard({ cluster }: { cluster: Cluster }) {
  const members = activeMembers(cluster);
  const hiddenCount = Math.max(0, members.length - MAX_TICKERS);
  const daysTracked = cluster.leadShare.length;

  return (
    <li>
      <Link
        to={`/potent-scan/clusters/${cluster.id}`}
        className="group block h-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <Card className="flex h-full flex-col gap-4 p-6 duration-150 group-hover:border-slate-300 dark:group-hover:border-slate-500">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {cluster.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
              {cluster.description}
            </p>
          </div>

          <ul
            aria-label="Members"
            className="flex flex-wrap content-start gap-1.5"
          >
            {members.slice(0, MAX_TICKERS).map((member) => (
              <li key={member.ticker}>
                <Badge variant="outline" className="font-mono font-medium">
                  {member.ticker}
                </Badge>
              </li>
            ))}
            {hiddenCount > 0 && (
              <li className="self-center text-xs text-slate-600 dark:text-slate-400">
                +{hiddenCount} more
              </li>
            )}
          </ul>

          <div className="mt-auto space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
            <div className="flex items-baseline justify-between gap-4">
              <span className={LABEL_CLASS}>Lead / active</span>
              <span className="font-mono text-lg tabular-nums">
                {cluster.leadCount} / {members.length}
              </span>
            </div>
            <ClusterProgressionSparkline days={cluster.dailyTierCounts} />
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            Created {formatTimestampDate(cluster.createdAt)} · {daysTracked}{" "}
            {daysTracked === 1 ? "day" : "days"} tracked
          </p>
        </Card>
      </Link>
    </li>
  );
}

export function ClusterCardGrid({ clusters }: { clusters: Cluster[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {clusters.map((cluster) => (
        <ClusterCard key={cluster.id} cluster={cluster} />
      ))}
    </ul>
  );
}
