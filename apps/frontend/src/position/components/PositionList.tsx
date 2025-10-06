import { useState } from "react";
import { usePositions } from "../hooks/use-positions";
import {
  Alert,
  Badge,
  Button,
  Card,
  LoadingSpinner,
} from "src/global/design-system";
import { Shield, TrendingDown, TrendingUp, Eye } from "lucide-react";
import { BuySharesModal } from "./BuySharesModal";
import { SellSharesModal } from "./SellSharesModal";
import { SetStopLossModal } from "./SetStopLossModal";
import { MinimalPositionChart } from "./MinimalPositionChart";
import { Link } from "react-router";

export function PositionList() {
  const { data, isLoading, error } = usePositions();
  const [activeModal, setActiveModal] = useState<{
    type: "buy" | "sell" | "stop-loss" | null;
    positionId: string;
    instrument: string;
    currentQuantity?: number;
  }>({ type: null, positionId: "", instrument: "" });

  console.log("Positions Data:", data);

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
        <Card key={position.id} className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            {/* Left side - Position info and actions */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-4">
                <Link
                  to={`/positions/${position.id}`}
                  className="text-xl font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {position.instrument}
                </Link>
                <Badge
                  variant={position.isClosed ? "secondary" : "default"}
                  className={
                    position.isClosed
                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  }
                >
                  {position.isClosed ? "Closed" : "Open"}
                </Badge>
              </div>

              {/* Position metrics */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Current Quantity
                  </div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {position.currentQty} shares
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    Total Events
                  </div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {position.events.length}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <Link to={`/positions/${position.id}`}>
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setActiveModal({
                      type: "buy",
                      positionId: position.id,
                      instrument: position.instrument,
                    })
                  }
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Buy
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setActiveModal({
                      type: "sell",
                      positionId: position.id,
                      instrument: position.instrument,
                      currentQuantity: position.currentQty,
                    })
                  }
                >
                  <TrendingDown className="h-4 w-4 mr-1" />
                  Sell
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setActiveModal({
                      type: "stop-loss",
                      positionId: position.id,
                      instrument: position.instrument,
                    })
                  }
                >
                  <Shield className="h-4 w-4 mr-1" />
                  Stop Loss
                </Button>
              </div>
            </div>

            {/* Right side - Chart */}
            <div className="w-full lg:w-80 flex-shrink-0 h-48">
              <MinimalPositionChart
                instrument={position.instrument}
                events={position.events}
                className="w-full h-full"
              />
            </div>
          </div>
        </Card>
      ))}

      {/* Action Modals */}
      <BuySharesModal
        positionId={activeModal.positionId}
        instrument={activeModal.instrument}
        isOpen={activeModal.type === "buy"}
        onClose={() =>
          setActiveModal({ type: null, positionId: "", instrument: "" })
        }
      />

      <SellSharesModal
        positionId={activeModal.positionId}
        instrument={activeModal.instrument}
        currentQuantity={activeModal.currentQuantity || 0}
        isOpen={activeModal.type === "sell"}
        onClose={() =>
          setActiveModal({ type: null, positionId: "", instrument: "" })
        }
      />

      <SetStopLossModal
        positionId={activeModal.positionId}
        instrument={activeModal.instrument}
        isOpen={activeModal.type === "stop-loss"}
        onClose={() =>
          setActiveModal({ type: null, positionId: "", instrument: "" })
        }
      />
    </div>
  );
}
