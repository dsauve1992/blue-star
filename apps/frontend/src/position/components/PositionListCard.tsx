import { Badge, Button, Card } from "src/global/design-system";
import { Link } from "react-router";
import { Eye, Shield, TrendingDown, TrendingUp } from "lucide-react";
import { MinimalPositionChart } from "src/position/components/MinimalPositionChart.tsx";
import type { Position } from "src/position/api/position.client.ts";

export interface PositionListCardProps {
  position: Position;
  onClickBuy?: () => void;
  onClickSell?: () => void;
  onClickSetStopLoss?: () => void;
}

export const PositionListCard = ({
  position,
  onClickBuy,
  onClickSell,
  onClickSetStopLoss,
}: PositionListCardProps) => {
  return (
    <Card key={position.id} className="p-6">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
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

          <div className="flex flex-wrap gap-2">
            <Link to={`/positions/${position.id}`}>
              <Button size="sm" variant="outline">
                <Eye className="h-4 w-4 mr-1" />
                View Details
              </Button>
            </Link>
            <Button size="sm" variant="outline" onClick={onClickBuy}>
              <TrendingUp className="h-4 w-4 mr-1" />
              Buy
            </Button>
            <Button size="sm" variant="outline" onClick={onClickSell}>
              <TrendingDown className="h-4 w-4 mr-1" />
              Sell
            </Button>
            <Button size="sm" variant="outline" onClick={onClickSetStopLoss}>
              <Shield className="h-4 w-4 mr-1" />
              Stop Loss
            </Button>
          </div>
        </div>

        <div className="w-full lg:w-80 flex-shrink-0 h-48">
          <MinimalPositionChart
            instrument={position.instrument}
            events={position.events}
            className="w-full h-full"
          />
        </div>
      </div>
    </Card>
  );
};
