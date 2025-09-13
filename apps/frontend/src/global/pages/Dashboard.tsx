import { Card, CardContent, CardHeader, CardTitle } from "src/design-system";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
          Dashboard
        </h1>
        <p className="text-slate-600 dark:text-slate-300 mt-1">
          Welcome back! Here's your portfolio overview
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Portfolio Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 dark:text-slate-300">
            Your portfolio data will appear here once connected to the backend.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
