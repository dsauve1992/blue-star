import {
  Alert,
  AlertDescription,
  Button,
  Card,
  cn,
} from "src/global/design-system";
import type {
  ClusterDetail,
  ClusterMemberDetail,
} from "../api/potent-scan.client";
import { useRemoveClusterMember } from "../hooks/use-remove-cluster-member";
import { formatSessionDate, formatTimestampDate } from "../utils/format";
import { ClusterMemberChart } from "./ClusterMemberChart";
import { SourceLink } from "./SourceLink";
import { TierBadge } from "./TierBadge";
import { TierPath } from "./TierPath";

const LABEL_CLASS =
  "text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400";

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

export function ClusterMemberCards({ cluster }: { cluster: ClusterDetail }) {
  const removeMember = useRemoveClusterMember(cluster.id);
  const dates = tierDates(cluster.members);
  const isClosed = cluster.status === "closed";

  return (
    <div className="space-y-4">
      {removeMember.error && (
        <Alert variant="danger">
          <AlertDescription>{removeMember.error.message}</AlertDescription>
        </Alert>
      )}
      <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {cluster.members.map((member, index) => {
          const isRemoved = member.removedAt !== null;
          const latestTier = member.tiers.at(-1)?.tier;
          return (
            <li key={`${member.ticker}-${index}`}>
              <Card
                className={cn(
                  "flex h-full flex-col gap-4 p-6",
                  isRemoved && "text-slate-600 dark:text-slate-400",
                )}
              >
                <div className="flex items-center gap-3">
                  <h3 className="font-mono text-lg font-semibold">
                    {member.ticker}
                  </h3>
                  {isRemoved ? (
                    <span className="text-xs">
                      Removed {formatTimestampDate(member.removedAt!)}
                    </span>
                  ) : (
                    latestTier && <TierBadge tier={latestTier} />
                  )}
                  {!isRemoved && !isClosed && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                      disabled={removeMember.isPending}
                      onClick={() => removeMember.mutate(member.ticker)}
                    >
                      Remove
                    </Button>
                  )}
                </div>

                {!isRemoved && <ClusterMemberChart member={member} />}

                <dl className="grid grid-cols-3 gap-4">
                  <div>
                    <dt className={LABEL_CLASS}>Joined</dt>
                    <dd className="mt-1 text-sm">
                      {formatTimestampDate(member.joinedAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className={LABEL_CLASS}>Since join</dt>
                    <dd
                      className={cn(
                        "mt-1 font-mono text-sm tabular-nums",
                        !isRemoved && returnClass(member.returnSinceJoinPct),
                      )}
                    >
                      {formatPercent(member.returnSinceJoinPct)}
                    </dd>
                  </div>
                  <div>
                    <dt className={LABEL_CLASS}>ADR %</dt>
                    <dd className="mt-1 font-mono text-sm tabular-nums">
                      {formatPercent(member.adrPct)}
                    </dd>
                  </div>
                </dl>

                {dates.length > 0 && (
                  <div>
                    <div className={LABEL_CLASS}>
                      Tier path
                      <span className="ml-1 font-normal normal-case tracking-normal">
                        ({formatSessionDate(dates[0])} →{" "}
                        {formatSessionDate(dates[dates.length - 1])})
                      </span>
                    </div>
                    <div
                      className={cn(
                        "mt-1 overflow-x-auto",
                        isRemoved && "opacity-50",
                      )}
                    >
                      <TierPath dates={dates} tiers={member.tiers} />
                    </div>
                  </div>
                )}

                {(member.reason || member.source) && (
                  <div
                    className={cn(
                      "text-sm",
                      !isRemoved && "text-slate-700 dark:text-slate-300",
                    )}
                  >
                    {member.reason}
                    {member.source && (
                      <div className="break-all text-xs">
                        <SourceLink source={member.source} />
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
