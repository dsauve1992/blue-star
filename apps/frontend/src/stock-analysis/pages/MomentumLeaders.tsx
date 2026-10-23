import { useMemo, useState } from "react";
import { PageContainer } from "src/global/design-system/page-container";
import {
  Alert,
  AlertDescription,
  Button,
  LoadingSpinner,
} from "src/global/design-system";
import { useMomentumLeaders } from "../hooks/use-momentum-leaders";
import { useRunMomentumLeaders } from "../hooks/use-run-momentum-leaders";
import { useLeaderSelection } from "../hooks/use-leader-selection";
import { useSortedLeaders } from "../hooks/use-sorted-leaders";
import {
  useLeaderGroups,
  type LeaderGroupBy,
} from "../hooks/use-leader-groups";
import { leaderTickerFullName } from "../api/momentum-leaders.client";
import { useConsolidationKeyboardNavigation } from "../hooks/use-consolidation-keyboard-navigation";
import { useLatestSectorStatus } from "src/sector-rotation/hooks/use-latest-sector-status";
import { INDUSTRY_GROUP_UNIVERSE_ID } from "src/sector-rotation/utils/industry-group-utils";
import { LeadersToolbar } from "../components/LeadersToolbar";
import { LeadersWorkspace } from "../components/LeadersWorkspace";

export default function MomentumLeaders() {
  const { data, isLoading, isFetching, error, refetch } = useMomentumLeaders();
  const runScan = useRunMomentumLeaders();
  const { data: industryGroupStatusData } = useLatestSectorStatus(
    INDUSTRY_GROUP_UNIVERSE_ID,
  );
  const industryGroupStatuses = useMemo(
    () => industryGroupStatusData?.sectors ?? [],
    [industryGroupStatusData],
  );

  const [groupBy, setGroupBy] = useState<LeaderGroupBy>("industryGroup");
  const scannedLeaders = useMemo(() => data?.leaders ?? [], [data]);
  const { sortKey, setSortKey, sortedLeaders, rsBySymbol, isLoadingRatings } =
    useSortedLeaders(scannedLeaders);
  const { groups, orderedLeaders } = useLeaderGroups(
    sortedLeaders,
    groupBy,
    rsBySymbol,
    industryGroupStatuses,
  );
  const { selectedTicker, setSelectedTicker } = useLeaderSelection(
    isLoadingRatings ? [] : orderedLeaders,
  );

  const orderedTickers = useMemo(
    () => orderedLeaders.map(leaderTickerFullName),
    [orderedLeaders],
  );
  useConsolidationKeyboardNavigation({
    tickers: orderedTickers,
    selectedTicker,
    onTickerChange: setSelectedTicker,
  });

  const hasData = (data?.count ?? 0) > 0;

  return (
    <PageContainer fullWidth noPadding>
      <div className="w-full h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <LeadersToolbar
          data={data}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          sortKey={sortKey}
          onSortChange={setSortKey}
          isRefreshing={isFetching}
          onRefresh={() => refetch()}
        />

        <div className="flex-1 min-h-0 flex">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <LoadingSpinner
                label="Loading leaders..."
                className="[&>span]:text-slate-400"
              />
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <Alert variant="danger">
                <AlertDescription>
                  Failed to load momentum leaders. Please try again.
                </AlertDescription>
              </Alert>
            </div>
          ) : !hasData ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
              <Alert variant="warning" className="max-w-md">
                <AlertDescription>No scan has been run yet.</AlertDescription>
              </Alert>
              {runScan.isError && (
                <Alert variant="danger" className="max-w-md">
                  <AlertDescription>
                    The scan failed to run. Please try again.
                  </AlertDescription>
                </Alert>
              )}
              <Button
                variant="default"
                onClick={() => runScan.mutate()}
                disabled={runScan.isPending}
              >
                {runScan.isPending ? "Running Scan..." : "Run Scan Now"}
              </Button>
            </div>
          ) : (
            <LeadersWorkspace
              groups={groups}
              orderedLeaders={orderedLeaders}
              rsBySymbol={rsBySymbol}
              showIndustryGroup={groupBy !== "industryGroup"}
              selectedTicker={selectedTicker}
              onSelect={setSelectedTicker}
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
}
