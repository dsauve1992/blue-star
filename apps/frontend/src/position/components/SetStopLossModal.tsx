import { useState } from "react";
import {
  Button,
  Card,
  Input,
  Label,
  DateInput,
} from "src/global/design-system";
import { useSetStopLoss } from "../hooks/use-positions";
import type { Position } from "src/position/api/position.client.ts";

interface SetStopLossModalProps {
  position: Position | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SetStopLossModal({
  position,
  isOpen,
  onClose,
}: SetStopLossModalProps) {
  const [stopPrice, setStopPrice] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setStopLossMutation = useSetStopLoss();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!stopPrice || isNaN(Number(stopPrice)) || Number(stopPrice) <= 0) {
      newErrors.stopPrice = "Stop price must be a positive number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await setStopLossMutation.mutateAsync({
        positionId: position!.id,
        request: {
          stopPrice: Number(stopPrice),
          timestamp: new Date(date).toISOString(),
          note: note || undefined,
        },
      });

      // Reset form and close modal
      setStopPrice("");
      setNote("");
      setDate(new Date().toISOString().split("T")[0]);
      setErrors({});
      onClose();
    } catch (error) {
      console.error("Failed to set stop loss:", error);
    }
  };

  const handleClose = () => {
    setStopPrice("");
    setNote("");
    setDate(new Date().toISOString().split("T")[0]);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Set Stop Loss for {position!.instrument}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            ×
          </Button>
        </div>

        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Stop Loss:</strong> A stop loss order will automatically
            sell your shares if the price drops to or below the specified stop
            price.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="stopPrice">Stop Price</Label>
            <Input
              id="stopPrice"
              type="number"
              step="0.01"
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              placeholder="Enter stop price"
              className={errors.stopPrice ? "border-red-500" : ""}
            />
            {errors.stopPrice && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {errors.stopPrice}
              </p>
            )}
          </div>

          <div>
            <DateInput
              label="Stop Loss Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              helperText="Select the date when this stop loss was set"
            />
          </div>

          <div>
            <Label htmlFor="note">Note (Optional)</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="warning"
              disabled={setStopLossMutation.isPending}
              className="flex-1"
            >
              {setStopLossMutation.isPending ? "Setting..." : "Set Stop Loss"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
