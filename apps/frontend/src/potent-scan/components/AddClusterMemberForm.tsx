import { useState, type FormEvent } from "react";
import {
  Alert,
  AlertDescription,
  Button,
  Input,
  Label,
} from "src/global/design-system";
import { useAddClusterMember } from "../hooks/use-add-cluster-member";

export function AddClusterMemberForm({ clusterId }: { clusterId: string }) {
  const [ticker, setTicker] = useState("");
  const addMember = useAddClusterMember(clusterId);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    addMember.mutate(ticker.trim().toUpperCase(), {
      onSuccess: () => setTicker(""),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="cluster-add-ticker">Add ticker</Label>
          <Input
            id="cluster-add-ticker"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="NVDA"
            className="w-40 font-mono uppercase"
          />
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={addMember.isPending || ticker.trim() === ""}
        >
          {addMember.isPending ? "Adding…" : "Add"}
        </Button>
      </div>
      {addMember.error && (
        <Alert variant="danger">
          <AlertDescription>{addMember.error.message}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
