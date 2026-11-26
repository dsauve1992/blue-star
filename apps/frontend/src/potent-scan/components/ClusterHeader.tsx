import { useState, type FormEvent } from "react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Input,
  Label,
} from "src/global/design-system";
import type { ClusterDetail } from "../api/potent-scan.client";
import { useCloseCluster } from "../hooks/use-close-cluster";
import { useUpdateCluster } from "../hooks/use-update-cluster";
import { formatSessionDate, formatTimestampDate } from "../utils/format";
import { SourceLink } from "./SourceLink";

function RenameForm({
  cluster,
  onDone,
}: {
  cluster: ClusterDetail;
  onDone: () => void;
}) {
  const [name, setName] = useState(cluster.name);
  const [description, setDescription] = useState(cluster.description);
  const updateCluster = useUpdateCluster(cluster.id);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    updateCluster.mutate({ name, description }, { onSuccess: onDone });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-1">
          <Label htmlFor="cluster-rename-name">Name</Label>
          <Input
            id="cluster-rename-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cluster-rename-description">Description</Label>
          <Input
            id="cluster-rename-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
      {updateCluster.error && (
        <Alert variant="danger">
          <AlertDescription>{updateCluster.error.message}</AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={updateCluster.isPending || name.trim() === ""}
        >
          {updateCluster.isPending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function CloseClusterControl({ clusterId }: { clusterId: string }) {
  const [confirming, setConfirming] = useState(false);
  const closeCluster = useCloseCluster(clusterId);

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
        Close cluster
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-danger-200 bg-danger-50 px-3 py-2 dark:border-danger-800 dark:bg-danger-950">
      <span className="text-sm text-danger-800 dark:text-danger-200">
        Close this cluster? Tier tracking stops and members can no longer
        change.
      </span>
      <Button
        variant="destructive"
        size="sm"
        disabled={closeCluster.isPending}
        onClick={() =>
          closeCluster.mutate(undefined, {
            onSuccess: () => setConfirming(false),
          })
        }
      >
        {closeCluster.isPending ? "Closing…" : "Confirm close"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
      {closeCluster.error && (
        <span className="w-full text-sm text-danger-700 dark:text-danger-300">
          {closeCluster.error.message}
        </span>
      )}
    </div>
  );
}

export function ClusterHeader({ cluster }: { cluster: ClusterDetail }) {
  const [renaming, setRenaming] = useState(false);
  const isClosed = cluster.status === "closed";

  return (
    <div className="space-y-4 rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      {renaming ? (
        <RenameForm cluster={cluster} onDone={() => setRenaming(false)} />
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                {cluster.name}
              </h1>
              <Badge variant={isClosed ? "secondary" : "success"}>
                {isClosed ? "Closed" : "Tracking"}
              </Badge>
            </div>
            {cluster.description && (
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {cluster.description}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setRenaming(true)}>
              Rename
            </Button>
            {!isClosed && <CloseClusterControl clusterId={cluster.id} />}
          </div>
        </div>
      )}
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_minmax(0,1fr)]">
        <dt className="text-slate-500 dark:text-slate-400">Catalyst</dt>
        <dd className="text-slate-900 dark:text-slate-100">
          {cluster.sharedCatalyst ?? "—"}
        </dd>
        <dt className="text-slate-500 dark:text-slate-400">Sources</dt>
        <dd className="text-slate-900 dark:text-slate-100">
          {cluster.sources.length === 0 ? (
            "—"
          ) : (
            <ul className="space-y-0.5">
              {cluster.sources.map((source) => (
                <li key={source}>
                  <SourceLink source={source} />
                </li>
              ))}
            </ul>
          )}
        </dd>
        <dt className="text-slate-500 dark:text-slate-400">Origin</dt>
        <dd className="text-slate-900 dark:text-slate-100">
          {cluster.origin === "manual"
            ? "Manual"
            : `AI proposal ${cluster.origin}`}{" "}
          · scan of {formatSessionDate(cluster.sourceScanDate)}
        </dd>
        <dt className="text-slate-500 dark:text-slate-400">Created</dt>
        <dd className="text-slate-900 dark:text-slate-100">
          {formatTimestampDate(cluster.createdAt)}
          {cluster.closedAt &&
            ` · closed ${formatTimestampDate(cluster.closedAt)}`}
        </dd>
      </dl>
    </div>
  );
}
