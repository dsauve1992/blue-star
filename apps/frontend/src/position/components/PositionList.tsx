import { useState } from "react";
import { usePositions } from "../hooks/use-positions";
import { Alert, Card, LoadingSpinner } from "src/global/design-system";
import { TrendingUp } from "lucide-react";
import { BuySharesModal } from "./BuySharesModal";
import { SellSharesModal } from "./SellSharesModal";
import { SetStopLossModal } from "./SetStopLossModal";
import { PositionListCard } from "src/position/components/PositionListCard.tsx";
import type { Position } from "src/position/api/position.client.ts";

export function PositionList() {
  const { data, isLoading, error } = usePositions();
  const [activeModal, setActiveModal] = useState<{
    type: "buy" | "sell" | "stop-loss" | null;
    position: Position | null;
  }>({ type: null, position: null });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        Failed to load positions. Please try again.
      </Alert>
    );
  }

  if (!data?.positions || data.positions.length === 0) {
    return (
      <Card className="p-6 text-center">
        <TrendingUp className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          No positions yet
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Start by opening your first position to begin trading.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {data.positions.map((position) => (
        <PositionListCard
          position={position}
          onClickBuy={() => setActiveModal({ type: "buy", position })}
          onClickSell={() => setActiveModal({ type: "sell", position })}
          onClickSetStopLoss={() =>
            setActiveModal({ type: "stop-loss", position })
          }
        />
      ))}

      <BuySharesModal
        position={activeModal.position}
        isOpen={activeModal.type === "buy"}
        onClose={() => setActiveModal({ type: null, position: null })}
      />

      <SellSharesModal
        position={activeModal.position}
        isOpen={activeModal.type === "sell"}
        onClose={() => setActiveModal({ type: null, position: null })}
      />

      <SetStopLossModal
        position={activeModal.position}
        isOpen={activeModal.type === "stop-loss"}
        onClose={() => setActiveModal({ type: null, position: null })}
      />
    </div>
  );
}
