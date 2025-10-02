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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Link
                  to={`/positions/${position.id}`}
                  className="text-lg font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
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
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {position.currentQty} shares
                </div>
              </div>
              <div className="flex space-x-2">
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
          </div>

          {position.events.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Recent Activity
              </h4>
              <div className="space-y-1">
                {position.events.slice(-3).map((event, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-600 dark:text-slate-400">
                      {event.action} {event.qty && `${event.qty} shares`}
                      {event.price && ` at $${event.price}`}
                      {event.stop && ` (stop: $${event.stop})`}
                    </span>
                    <span className="text-slate-500 dark:text-slate-500">
                      {new Date(event.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
