import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "src/global/design-system";
import { Button } from "src/global/design-system";
import { Badge } from "src/global/design-system";
import { LoadingSpinner } from "src/global/design-system";
import { Alert, AlertDescription } from "src/global/design-system";
import { useConsolidations } from "../hooks/use-consolidations";
import { useRunConsolidationAnalysis } from "../hooks/use-run-consolidation-analysis";
import type { AnalyzeConsolidationsRequest } from "../api/consolidation.client";

type AnalysisType = "daily" | "weekly";

export default function ConsolidationAnalysis() {
  const [analysisType, setAnalysisType] = useState<AnalysisType>("daily");
  const request: AnalyzeConsolidationsRequest = {
    type: analysisType,
  };

  const { data, isLoading, error, refetch } = useConsolidations(request);
  const runAnalysis = useRunConsolidationAnalysis();

  const handleTypeChange = (type: AnalysisType) => {
    setAnalysisType(type);
  };

  const handleRunAnalysis = async () => {
    try {
      await runAnalysis.mutateAsync({ type: analysisType });
      setTimeout(() => {
        refetch();
      }, 2000);
    } catch (err) {
      console.error("Failed to run analysis:", err);
    }
  };

  const renderConsolidationList = (
    consolidations: Array<{ symbol: string; isNew: boolean }>,
    title: string,
  ) => {
    if (consolidations.length === 0) {
      return (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <p className="text-sm">
            No consolidation signals found for {title.toLowerCase()} timeframe.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {consolidations.map((consolidation) => (
          <div
            key={consolidation.symbol}
            className="flex items-center justify-between p-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {consolidation.symbol}
            </span>
            {consolidation.isNew && (
              <Badge variant="success" className="ml-2">
                New
              </Badge>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Consolidation Analysis
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Analyze stock consolidation patterns using technical indicators
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Analysis Type</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={analysisType === "daily" ? "default" : "outline"}
              size="sm"
              onClick={() => handleTypeChange("daily")}
            >
              Daily
            </Button>
            <Button
              variant={analysisType === "weekly" ? "default" : "outline"}
              size="sm"
              onClick={() => handleTypeChange("weekly")}
            >
              Weekly
            </Button>
          </div>

          {isLoading && (
            <div className="flex justify-center items-center py-8">
              <LoadingSpinner />
            </div>
          )}

          {error && (
            <Alert variant="danger" className="mb-6">
              <AlertDescription>
                Failed to load consolidation data. Please try again.
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && !error && data && (
            <div className="space-y-6">
              {!data.hasData && (
                <Alert
                  variant={data.runStatus === "failed" ? "danger" : "warning"}
                  className="mb-6"
                >
                  <AlertDescription>
                    {data.runStatus === "running" && (
                      <>
                        Analysis is currently running. Data will be available
                        shortly.
                      </>
                    )}
                    {data.runStatus === "failed" && (
                      <>
                        Analysis failed: {data.errorMessage || "Unknown error"}.
                        You can manually trigger a new analysis.
                      </>
                    )}
                    {data.runStatus === "not_found" && (
                      <>
                        No analysis has been run yet for today. Analysis runs
                        automatically after market close (5pm). You can manually
                        trigger it now.
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {data.hasData ? (
                <>
                  {analysisType === "daily" && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                        Daily Consolidations ({data.dailyCount})
                      </h3>
                      {renderConsolidationList(data.daily, "Daily")}
                    </div>
                  )}

                  {analysisType === "weekly" && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                        Weekly Consolidations ({data.weeklyCount})
                      </h3>
                      {renderConsolidationList(data.weekly, "Weekly")}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500 dark:text-slate-400 mb-4">
                    No consolidation data available for{" "}
                    {analysisType === "daily" ? "today" : "this week"}.
                  </p>
                  <Button
                    variant="default"
                    onClick={handleRunAnalysis}
                    disabled={runAnalysis.isPending}
                  >
                    {runAnalysis.isPending
                      ? "Running Analysis..."
                      : "Run Analysis Now"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
