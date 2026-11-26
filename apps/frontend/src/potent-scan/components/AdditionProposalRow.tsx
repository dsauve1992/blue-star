import { Link } from "react-router";
import { Alert, AlertDescription, Button } from "src/global/design-system";
import type { AdditionProposal, Tier } from "../api/potent-scan.client";
import { useAcceptProposal } from "../hooks/use-accept-proposal";
import { useRejectProposal } from "../hooks/use-reject-proposal";
import { ProposalStatusBadge } from "./ProposalDecision";
import { SourceLink } from "./SourceLink";
import { TierBadge } from "./TierBadge";

interface AdditionProposalRowProps {
  addition: AdditionProposal;
  tier: Tier | null;
}

export function AdditionProposalRow({
  addition,
  tier,
}: AdditionProposalRowProps) {
  const accept = useAcceptProposal(addition.id);
  const reject = useRejectProposal(addition.id);
  const isBusy = accept.isPending || reject.isPending;
  const error = accept.error ?? reject.error;

  return (
    <li className="space-y-2 border-t border-slate-200 py-2 first:border-t-0 dark:border-slate-700">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
              {addition.ticker}
            </span>
            <TierBadge tier={tier} />
            <span className="text-slate-600 dark:text-slate-400">→</span>
            <Link
              to={`/potent-scan/clusters/${addition.existingClusterId}`}
              className="font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              {addition.existingClusterName}
            </Link>
            <ProposalStatusBadge status={addition.status} />
          </div>
          <p className="text-slate-700 dark:text-slate-300">
            {addition.reason}
          </p>
          {addition.source && (
            <p className="text-xs">
              <SourceLink source={addition.source} />
            </p>
          )}
        </div>
        {addition.status === "pending" && (
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
              variant="ghost"
              disabled={isBusy}
              onClick={() => reject.mutate()}
            >
              Reject
            </Button>
          </div>
        )}
      </div>
      {error && (
        <Alert variant="danger">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
    </li>
  );
}
