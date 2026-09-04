import { PageContainer } from "../design-system/page-container";
import { MarketBreadthCard } from "../../market-breadth/components/MarketBreadthCard";
import { TrendBreadthCard } from "../../market-breadth/components/TrendBreadthCard";

export default function Dashboard() {
  return (
    <PageContainer fullWidth>
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
          <TrendBreadthCard />
          <MarketBreadthCard />
        </div>
      </div>
    </PageContainer>
  );
}
