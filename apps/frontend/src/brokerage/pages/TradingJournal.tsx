import { useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  LoadingSpinner,
  PageContainer,
} from "../../global/design-system";
import type { ApiError } from "../../global/api/types";
import { CampaignTable } from "../components/CampaignTable";
import { JournalStatsGrid } from "../components/JournalStatsGrid";
import {
  useBrokerAccounts,
  useTradingJournal,
} from "../hooks/use-trading-journal";

export function TradingJournal() {
  const accounts = useBrokerAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const accountId = selectedAccountId ?? accounts.data?.accounts[0] ?? null;
  const journal = useTradingJournal(accountId);

  return (
    <PageContainer>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Trading Journal
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Campaigns from the last 7 days of IBKR executions, plus open
            positions. R uses the stop that filled, or the current working stop
            for open positions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {accounts.data && accounts.data.accounts.length > 1 && (
            <select
              aria-label="Account"
              value={accountId ?? ""}
              onChange={(event) => setSelectedAccountId(event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {accounts.data.accounts.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          )}
          <Button
            variant="outline"
            onClick={() => {
              void accounts.refetch();
              void journal.refetch();
            }}
            disabled={journal.isFetching || accounts.isFetching}
          >
            Refresh
          </Button>
        </div>
      </div>

      <JournalBody
        isLoading={accounts.isLoading || journal.isLoading}
        error={(accounts.error ?? journal.error) as ApiError | null}
        hasNoAccount={accounts.data?.accounts.length === 0}
        journal={journal.data}
      />
    </PageContainer>
  );
}

interface JournalBodyProps {
  isLoading: boolean;
  error: ApiError | null;
  hasNoAccount: boolean;
  journal: ReturnType<typeof useTradingJournal>["data"];
}

function JournalBody({
  isLoading,
  error,
  hasNoAccount,
  journal,
}: JournalBodyProps) {
  if (error) {
    return (
      <Alert variant="danger">
        <AlertTitle>The journal could not be loaded</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }
  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }
  if (hasNoAccount) {
    return (
      <Alert variant="info">
        <AlertDescription>
          The IBKR gateway session has no account.
        </AlertDescription>
      </Alert>
    );
  }
  if (!journal) {
    return null;
  }

  const unmeasured =
    journal.stats.closedCampaigns - journal.stats.campaignsWithR;
  return (
    <div className="space-y-6">
      <section aria-label="Statistics" className="space-y-2">
        <JournalStatsGrid stats={journal.stats} />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Statistics cover {journal.stats.campaignsWithR} of{" "}
          {journal.stats.closedCampaigns} closed campaigns.
          {unmeasured > 0 &&
            ` ${unmeasured} closed without a stop fill, so their R is unknown.`}
        </p>
      </section>
      {journal.campaigns.length === 0 ? (
        <Alert variant="info">
          <AlertDescription>
            No campaign in the last 7 days and no open position.
          </AlertDescription>
        </Alert>
      ) : (
        <CampaignTable campaigns={journal.campaigns} />
      )}
    </div>
  );
}
