import { ChevronLeft } from "lucide-react";
import { Link, useParams } from "react-router";
import {
  Alert,
  AlertDescription,
  LoadingSpinner,
  PageContainer,
} from "src/global/design-system";
import { AddClusterMemberForm } from "../components/AddClusterMemberForm";
import { ClusterHeader } from "../components/ClusterHeader";
import { ClusterMembersTable } from "../components/ClusterMembersTable";
import { useCluster } from "../hooks/use-cluster";

export function ClusterDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const cluster = useCluster(id);

  return (
    <PageContainer fullWidth className="space-y-4">
      <Link
        to="/potent-scan?tab=clusters"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <ChevronLeft className="h-4 w-4" />
        Clusters
      </Link>
      {cluster.isLoading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      )}
      {cluster.error && (
        <Alert variant="danger">
          <AlertDescription>
            Couldn't load cluster: {cluster.error.message}
          </AlertDescription>
        </Alert>
      )}
      {cluster.data && (
        <>
          <ClusterHeader cluster={cluster.data} />
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Members
            </h2>
            {cluster.data.status === "tracking" && (
              <AddClusterMemberForm clusterId={cluster.data.id} />
            )}
            <ClusterMembersTable cluster={cluster.data} />
          </section>
        </>
      )}
    </PageContainer>
  );
}
