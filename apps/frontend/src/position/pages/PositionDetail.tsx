import { useParams, Link } from "react-router";
import { ArrowLeft, TrendingUp, TrendingDown, Shield } from "lucide-react";
import { usePositionById } from "../hooks/use-positions";
import { useHistoricalData } from "../hooks/use-market-data";
import { PositionHistoryChart } from "../components/PositionHistoryChart.tsx";
import { BuySharesModal } from "../components/BuySharesModal";
import { SellSharesModal } from "../components/SellSharesModal";
import { SetStopLossModal } from "../components/SetStopLossModal";
import {
  Alert,
  Badge,
  Button,
  Card,
  LoadingSpinner,
} from "src/global/design-system";
import { useState } from "react";

export function PositionDetail() {
  const { positionId } = useParams<{ positionId: string }>();
  const {
    data: position,
    isLoading,
    error,
  } = usePositionById(positionId || "");
  const [activeModal, setActiveModal] = useState<{
    type: "buy" | "sell" | "stop-loss" | null;
  }>({ type: null });

  // Calculate date range for historical data
  const getDateRange = () => {
    if (!position?.events || position.events.length === 0) {
      // Default to last 3 months if no events
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);
      return {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      };
    }

    const timestamps = position.events.map(
      (event) => new Date(event.timestamp),
    );
    const startTime = Math.min(...timestamps.map((d) => d.getTime()));
    const endTime = Math.max(...timestamps.map((d) => d.getTime()));

    // Add padding: 30 days before first event, 7 days after last event
    const startDate = new Date(startTime);
    startDate.setDate(startDate.getDate() - 30);

    const endDate = new Date(endTime);
    endDate.setDate(endDate.getDate() + 7);

    // Ensure we stay within daily data range (90 days max for daily data)
    const maxDays = 90;
    const totalDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (totalDays > maxDays) {
      // If range is too large, center it around the events with max 90 days
      const centerTime = (startTime + endTime) / 2;
      const halfRange = maxDays / 2;
      startDate.setTime(centerTime - halfRange * 24 * 60 * 60 * 1000);
      endDate.setTime(centerTime + halfRange * 24 * 60 * 60 * 1000);
    }

    // Ensure end date is not in the future
    const today = new Date();
    if (endDate > today) {
      endDate.setTime(today.getTime());
    }

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    };
  };

  const dateRange = position ? getDateRange() : { startDate: "", endDate: "" };

  const {
    data: historicalData,
    isLoading: isLoadingHistorical,
    error: historicalError,
  } = useHistoricalData(
    position?.instrument || "",
    dateRange.startDate,
    dateRange.endDate,
    !!position,
  );

  // Use real position events
  const positionEvents = position?.events || [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    const isNotFound =
      error.message?.includes("not found") ||
      error.message?.includes("404") ||
      error.message?.includes("Position with ID");

    return (
      <div className="space-y-4">
        <Link
          to="/positions"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Positions
        </Link>
        <Alert variant="danger">
          {isNotFound ? (
            <div>
              <h3 className="font-semibold mb-2">Position Not Found</h3>
              <p>
                The position you're looking for doesn't exist or you don't have
                permission to view it.
              </p>
            </div>
          ) : (
            "Failed to load position details. Please try again."
          )}
        </Alert>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="space-y-4">
        <Link
          to="/positions"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Positions
        </Link>
        <Alert variant="danger">
          <div>
            <h3 className="font-semibold mb-2">Position Not Found</h3>
            <p>
              The position you're looking for doesn't exist or you don't have
              permission to view it.
            </p>
          </div>
        </Alert>
      </div>
    );
  }

  // Calculate position metrics
  const totalBuyEvents = position.events.filter(
    (e) => e.action === "BUY",
  ).length;
  const totalSellEvents = position.events.filter(
    (e) => e.action === "SELL",
  ).length;
  const stopLossEvents = position.events.filter(
    (e) => e.action === "STOP_LOSS",
  ).length;

  // Calculate average buy price
  const buyEvents = position.events.filter(
    (e) => e.action === "BUY" && e.price,
  );
  const totalBuyQuantity = buyEvents.reduce(
    (sum, e) => sum + (e.quantity || 0),
    0,
  );
  const totalBuyValue = buyEvents.reduce(
    (sum, e) => sum + (e.quantity || 0) * (e.price || 0),
    0,
  );
  const averageBuyPrice =
    totalBuyQuantity > 0 ? totalBuyValue / totalBuyQuantity : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/positions"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Positions
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {position.instrument} Position
            </h1>
          </div>
        </div>
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

      {/* Position Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h3 className="font-medium text-slate-900 dark:text-slate-100">
              Current Quantity
            </h3>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {position.currentQty}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">shares</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <h3 className="font-medium text-slate-900 dark:text-slate-100">
              Average Buy Price
            </h3>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            ${averageBuyPrice.toFixed(2)}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            per share
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingDown className="h-5 w-5 text-red-600" />
            <h3 className="font-medium text-slate-900 dark:text-slate-100">
              Total Events
            </h3>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {position.events.length}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {totalBuyEvents} buys, {totalSellEvents} sells
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-5 w-5 text-amber-600" />
            <h3 className="font-medium text-slate-900 dark:text-slate-100">
              Stop Loss Orders
            </h3>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {stopLossEvents}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">active</p>
        </Card>
      </div>

      {/* Action Buttons */}
      {!position.isClosed && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Position Actions
          </h3>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => setActiveModal({ type: "buy" })}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Buy More Shares
            </Button>
            <Button
              variant="outline"
              onClick={() => setActiveModal({ type: "sell" })}
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              Sell Shares
            </Button>
            <Button
              variant="outline"
              onClick={() => setActiveModal({ type: "stop-loss" })}
            >
              <Shield className="h-4 w-4 mr-2" />
              Set Stop Loss
            </Button>
          </div>
        </Card>
      )}

      {/* Historical Price Chart */}
      {isLoadingHistorical ? (
        <Card className="p-6">
          <div className="flex justify-center items-center py-8">
            <LoadingSpinner />
            <span className="ml-2 text-slate-600 dark:text-slate-400">
              Loading historical price data...
            </span>
          </div>
        </Card>
      ) : historicalError ? (
        <Card className="p-6">
          <Alert variant="danger">
            <div>
              <h3 className="font-semibold mb-2">
                Failed to Load Historical Data
              </h3>
              <p>
                Unable to fetch historical price data for {position.instrument}.
                This could be due to an invalid symbol or network issues.
              </p>
              <p className="mt-2 text-sm">Error: {historicalError.message}</p>
            </div>
          </Alert>
        </Card>
      ) : historicalData ? (
        <>
          <PositionHistoryChart
            historicalData={historicalData.historicalData}
            events={positionEvents}
            instrument={position.instrument}
          />
        </>
      ) : (
        <Card className="p-6">
          <Alert variant="danger">
            No historical data available for {position.instrument}.
          </Alert>
        </Card>
      )}

      <BuySharesModal
        position={position}
        isOpen={activeModal.type === "buy"}
        onClose={() => setActiveModal({ type: null })}
      />

      <SellSharesModal
        position={position}
        isOpen={activeModal.type === "sell"}
        onClose={() => setActiveModal({ type: null })}
      />

      <SetStopLossModal
        position={position}
        isOpen={activeModal.type === "stop-loss"}
        onClose={() => setActiveModal({ type: null })}
      />
    </div>
  );
}
