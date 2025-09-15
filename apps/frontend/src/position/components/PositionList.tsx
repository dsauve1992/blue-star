import { usePositions } from '../hooks/use-positions';
import { Card } from '../../global/design-system/card';
import { Badge } from '../../global/design-system/badge';
import { Button } from '../../global/design-system/button';
import { LoadingSpinner } from '../../global/design-system/loading-spinner';
import { Alert } from '../../global/design-system/alert';
import { TrendingUp, TrendingDown, Shield } from 'lucide-react';

export function PositionList() {
  const { data, isLoading, error } = usePositions();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
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
        <Card key={position.positionId} className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {position.instrument}
                </span>
                <Badge
                  variant={position.isClosed ? 'secondary' : 'default'}
                  className={
                    position.isClosed
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }
                >
                  {position.isClosed ? 'Closed' : 'Open'}
                </Badge>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Portfolio: {position.portfolioId}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {position.currentQty} shares
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Position ID: {position.positionId.slice(0, 8)}...
                </div>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Buy
                </Button>
                <Button size="sm" variant="outline">
                  <TrendingDown className="h-4 w-4 mr-1" />
                  Sell
                </Button>
                <Button size="sm" variant="outline">
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
                      {new Date(event.ts).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
