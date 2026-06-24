import { Card, CardContent, CardHeader, CardTitle } from "../design-system";
import { PageContainer } from "../design-system/page-container";
import { LeaderBreadthCard } from "../../leader-breadth/components/LeaderBreadthCard";
import { PaperTradingCard } from "../../paper-trading/components/PaperTradingCard";

export default function Dashboard() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
            Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mt-1">
            Welcome back! Here's your portfolio overview
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-300">
                Your portfolio data will appear here once connected to the
                backend.
              </p>
            </CardContent>
          </Card>

          <LeaderBreadthCard />

          <PaperTradingCard />
        </div>
      </div>
    </PageContainer>
  );
}
