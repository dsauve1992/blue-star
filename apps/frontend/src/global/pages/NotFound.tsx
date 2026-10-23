import { Link } from "react-router";
import { Button } from "../design-system/button";
import { PageContainer } from "../design-system/page-container";

export default function NotFound() {
  return (
    <PageContainer fullWidth>
      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
        Page not found
      </h1>
      <p className="text-slate-600 dark:text-slate-300 mt-1">
        There is nothing at this address. Check the URL or head back to the
        dashboard.
      </p>
      <Button asChild className="mt-6">
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </PageContainer>
  );
}
