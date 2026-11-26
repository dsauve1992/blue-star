import { useState } from "react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
} from "src/global/design-system";
import type {
  NewClusterProposal,
  ProposedMember,
  Tier,
} from "../api/potent-scan.client";
import { useAcceptProposal } from "../hooks/use-accept-proposal";
import { useRejectProposal } from "../hooks/use-reject-proposal";
import {
  CreatedClusterLinks,
  ProposalStatusBadge,
  type CreatedClusterLink,
} from "./ProposalDecision";
import { ProposalEditForm } from "./ProposalEditForm";
import { SourceLink } from "./SourceLink";
import { TierBadge } from "./TierBadge";

export interface MergeOverlap {
  cluster: CreatedClusterLink;
  tickers: string[];
}

interface NewClusterProposalCardProps {
  proposal: NewClusterProposal;
  createdClusters: CreatedClusterLink[];
  mergeOverlaps: MergeOverlap[];
  tierBySymbol: Map<string, Tier | null>;
  hitSymbols: string[];
}

const HEADER_CLASS =
  "p-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400";

function MembersTable({
  members,
  tierBySymbol,
}: {
  members: ProposedMember[];
  tierBySymbol: Map<string, Tier | null>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-slate-900 dark:text-slate-100">
        <thead>
          <tr>
            <th className={`${HEADER_CLASS} text-left`}>Ticker</th>
            <th className={`${HEADER_CLASS} text-left`}>Tier</th>
            <th className={`${HEADER_CLASS} text-left`}>Reason</th>
            <th className={`${HEADER_CLASS} text-left`}>Catalyst today</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr
              key={member.ticker}
              className="border-t border-slate-200 align-top dark:border-slate-700"
            >
              <td className="p-1.5 font-mono font-semibold">{member.ticker}</td>
              <td className="p-1.5">
                <TierBadge tier={tierBySymbol.get(member.ticker) ?? null} />
              </td>
              <td className="p-1.5 text-slate-700 dark:text-slate-300">
                {member.reason}
              </td>
              <td className="p-1.5 text-slate-700 dark:text-slate-300">
                {member.catalystToday}
                {member.source && (
                  <div className="text-xs">
                    <SourceLink source={member.source} />
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function NewClusterProposalCard({
  proposal,
  createdClusters,
  mergeOverlaps,
  tierBySymbol,
  hitSymbols,
}: NewClusterProposalCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const accept = useAcceptProposal(proposal.id);
  const reject = useRejectProposal(proposal.id);
  const isPending = proposal.status === "pending";
  const isBusy = accept.isPending || reject.isPending;
  const error = accept.error ?? reject.error;

  return (
    <article className="space-y-3 rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              {proposal.name}
            </h3>
            <ProposalStatusBadge status={proposal.status} />
            {proposal.status === "edited" && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Edited, see cluster for final members
              </span>
            )}
            {proposal.appliedAlternative !== null && (
              <Badge variant="secondary">
                Applied{" "}
                {proposal.alternatives[proposal.appliedAlternative]?.kind}{" "}
                alternative
              </Badge>
            )}
          </div>
          <CreatedClusterLinks clusters={createdClusters} />
        </div>
        {isPending && !isEditing && (
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={isBusy}
              onClick={() => accept.mutate({})}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isBusy}
              onClick={() => reject.mutate()}
            >
              Reject
            </Button>
          </div>
        )}
      </header>

      {proposal.description && (
        <p className="text-sm text-slate-700 dark:text-slate-300">
          {proposal.description}
        </p>
      )}
      <dl className="grid gap-x-3 gap-y-1 text-sm md:grid-cols-[auto_minmax(0,1fr)]">
        <dt className="text-slate-500 dark:text-slate-400">Catalyst</dt>
        <dd className="text-slate-900 dark:text-slate-100">
          {proposal.sharedCatalyst}
        </dd>
        {proposal.sources.length > 0 && (
          <>
            <dt className="text-slate-500 dark:text-slate-400">Sources</dt>
            <dd>
              <ul className="space-y-0.5">
                {proposal.sources.map((source) => (
                  <li key={source}>
                    <SourceLink source={source} />
                  </li>
                ))}
              </ul>
            </dd>
          </>
        )}
      </dl>

      {isPending &&
        mergeOverlaps.map((overlap) => (
          <Alert key={overlap.cluster.id} variant="warning">
            <AlertDescription>
              The applied merge created{" "}
              <span className="font-medium">{overlap.cluster.name}</span> with{" "}
              <span className="font-mono">{overlap.tickers.join(", ")}</span>{" "}
              from this proposal. Reject it if the merge covers it.
            </AlertDescription>
          </Alert>
        ))}

      {isEditing && isPending ? (
        <ProposalEditForm
          proposal={proposal}
          hitSymbols={hitSymbols}
          isPending={accept.isPending}
          onAccept={(edit) =>
            accept.mutate({ edit }, { onSuccess: () => setIsEditing(false) })
          }
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <MembersTable members={proposal.members} tierBySymbol={tierBySymbol} />
      )}

      {proposal.alternatives.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
            Alternatives
          </h4>
          {proposal.alternatives.map((alternative, index) => (
            <div
              key={index}
              className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-dashed border-slate-300 p-2 dark:border-slate-600"
            >
              <div className="space-y-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{alternative.kind}</Badge>
                  <span className="text-slate-700 dark:text-slate-300">
                    {alternative.description}
                  </span>
                  {proposal.appliedAlternative === index && (
                    <Badge variant="success">Applied</Badge>
                  )}
                </div>
                <ul className="space-y-0.5 text-slate-600 dark:text-slate-400">
                  {alternative.clusters.map((cluster) => (
                    <li key={cluster.name}>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {cluster.name}
                      </span>
                      :{" "}
                      <span className="font-mono">
                        {cluster.members.map((m) => m.ticker).join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              {isPending && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isBusy}
                  onClick={() => accept.mutate({ alternativeIndex: index })}
                >
                  Apply
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <Alert variant="danger">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
    </article>
  );
}
