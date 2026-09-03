import { PageContainer } from "../design-system/page-container";
import { LeaderBreadthCard } from "../../leader-breadth/components/LeaderBreadthCard";

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

        <LeaderBreadthCard />
      </div>
    </PageContainer>
  );
}
