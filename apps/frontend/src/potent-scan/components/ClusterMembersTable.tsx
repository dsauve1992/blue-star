import { Alert, AlertDescription, Button, cn } from "src/global/design-system";
import type {
  ClusterDetail,
  ClusterMemberDetail,
} from "../api/potent-scan.client";
import { useRemoveClusterMember } from "../hooks/use-remove-cluster-member";
import { formatSessionDate, formatTimestampDate } from "../utils/format";
import { SourceLink } from "./SourceLink";
import { TierPath } from "./TierPath";

const HEADER_CLASS =
  "p-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400";

const formatPercent = (value: number | null) =>
  value === null ? "—" : `${value.toFixed(1)}%`;

function tierDates(members: ClusterMemberDetail[]): string[] {
  const dates = new Set(
    members.flatMap((member) => member.tiers.map((point) => point.date)),
  );
  return [...dates].sort();
}

function returnClass(value: number | null) {
  if (value === null || value === 0) return "";
  return value > 0
    ? "text-success-700 dark:text-success-400"
    : "text-danger-700 dark:text-danger-400";
}

export function ClusterMembersTable({ cluster }: { cluster: ClusterDetail }) {
  const removeMember = useRemoveClusterMember(cluster.id);
  const dates = tierDates(cluster.members);
  const isClosed = cluster.status === "closed";

  return (
    <div className="space-y-2">
      {removeMember.error && (
        <Alert variant="danger">
          <AlertDescription>{removeMember.error.message}</AlertDescription>
        </Alert>
      )}
      <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm text-slate-900 dark:text-slate-100">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className={`${HEADER_CLASS} text-left`}>Ticker</th>
              <th className={`${HEADER_CLASS} text-left`}>Joined</th>
              <th className={`${HEADER_CLASS} text-left`}>
                Tier path
                {dates.length > 0 && (
                  <span className="ml-1 font-normal normal-case tracking-normal">
                    ({formatSessionDate(dates[0])} →{" "}
                    {formatSessionDate(dates[dates.length - 1])})
                  </span>
                )}
              </th>
              <th className={`${HEADER_CLASS} text-right`}>Since join</th>
              <th className={`${HEADER_CLASS} text-right`}>ADR %</th>
              <th className={`${HEADER_CLASS} text-left`}>Reason</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {cluster.members.map((member, index) => {
              const isRemoved = member.removedAt !== null;
              return (
                <tr
                  key={`${member.ticker}-${index}`}
                  className={cn(
                    "border-t border-slate-200 dark:border-slate-700",
                    isRemoved && "text-slate-600 dark:text-slate-400",
                  )}
                >
                  <td className="p-2 font-mono font-semibold">
                    {member.ticker}
                    {isRemoved && (
                      <div className="font-sans text-xs font-normal text-slate-500 dark:text-slate-400">
                        Removed {formatTimestampDate(member.removedAt!)}
                      </div>
                    )}
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap p-2",
                      !isRemoved && "text-slate-700 dark:text-slate-300",
                    )}
                  >
                    {formatTimestampDate(member.joinedAt)}
                  </td>
                  <td className="p-2">
                    {dates.length === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <div className={cn(isRemoved && "opacity-50")}>
                        <TierPath dates={dates} tiers={member.tiers} />
                      </div>
                    )}
                  </td>
                  <td
                    className={cn(
                      "p-2 text-right font-mono tabular-nums",
                      !isRemoved && returnClass(member.returnSinceJoinPct),
                    )}
                  >
                    {formatPercent(member.returnSinceJoinPct)}
                  </td>
                  <td className="p-2 text-right font-mono tabular-nums">
                    {formatPercent(member.adrPct)}
                  </td>
                  <td
                    className={cn(
                      "max-w-md p-2",
                      !isRemoved && "text-slate-700 dark:text-slate-300",
                    )}
                  >
                    {member.reason ?? "—"}
                    {member.source && (
                      <div className="text-xs">
                        <SourceLink source={member.source} />
                      </div>
                    )}
                  </td>
                  <td className="p-2 text-right">
                    {!isRemoved && !isClosed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={removeMember.isPending}
                        onClick={() => removeMember.mutate(member.ticker)}
                      >
                        Remove
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
