import { useState, type FormEvent } from "react";
import {
  Alert,
  AlertDescription,
  Button,
  Input,
  Label,
} from "src/global/design-system";
import { useCreateCluster } from "../hooks/use-create-cluster";

interface CreateClusterFormProps {
  tickers: string[];
  sourceScanDate: string;
  onCreated: () => void;
  onCancel: () => void;
}

export function CreateClusterForm({
  tickers,
  sourceScanDate,
  onCreated,
  onCancel,
}: CreateClusterFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createCluster = useCreateCluster();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    createCluster.mutate(
      { name, description, tickers, sourceScanDate },
      { onSuccess: onCreated },
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400">
        New cluster from {tickers.length} hit{tickers.length === 1 ? "" : "s"}:{" "}
        <span className="font-mono text-slate-900 dark:text-slate-100">
          {tickers.join(", ")}
        </span>
      </p>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-1">
          <Label htmlFor="cluster-name">Name</Label>
          <Input
            id="cluster-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cluster-description">Description</Label>
          <Input
            id="cluster-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
      {createCluster.error && (
        <Alert variant="danger">
          <AlertDescription>{createCluster.error.message}</AlertDescription>
        </Alert>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={createCluster.isPending || name.trim() === ""}
        >
          {createCluster.isPending ? "Creating…" : "Create"}
        </Button>
      </div>
    </form>
  );
}
