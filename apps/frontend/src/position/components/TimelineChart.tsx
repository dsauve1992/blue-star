import { Card } from 'src/global/design-system';
import { TrendingUp, TrendingDown, Shield } from 'lucide-react';

interface TimelineEvent {
  action: string;
  timestamp: string;
  qty?: number;
  price?: number;
  stop?: number;
  note?: string;
}

interface TimelineChartProps {
  events: TimelineEvent[];
  instrument: string;
}

export function TimelineChart({ events, instrument }: TimelineChartProps) {
  if (events.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-slate-600 dark:text-slate-400">
          No events recorded for this position yet.
        </p>
      </Card>
    );
  }

  // Sort events by timestamp
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Calculate chart dimensions
  const chartWidth = 800;
  const chartHeight = 400;
  const margin = { top: 40, right: 40, bottom: 60, left: 80 };
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  // Get price range
  const prices = sortedEvents
    .filter(event => event.price !== undefined)
    .map(event => event.price!);
  
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const pricePadding = priceRange * 0.1; // 10% padding

  // Scale functions
  const xScale = (timestamp: string) => {
    const startTime = new Date(sortedEvents[0].timestamp).getTime();
    const endTime = new Date(sortedEvents[sortedEvents.length - 1].timestamp).getTime();
    const timeRange = endTime - startTime;
    const eventTime = new Date(timestamp).getTime();
    return margin.left + ((eventTime - startTime) / timeRange) * innerWidth;
  };

  const yScale = (price: number) => {
    const scaledPrice = (price - (minPrice - pricePadding)) / (priceRange + 2 * pricePadding);
    return margin.top + innerHeight - (scaledPrice * innerHeight);
  };

  // Get event icon and color
  const getEventIcon = (action: string) => {
    switch (action) {
      case 'BUY':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'SELL':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'STOP_LOSS':
        return <Shield className="h-4 w-4 text-amber-600" />;
      default:
        return <div className="h-4 w-4 bg-slate-400 rounded-full" />;
    }
  };

  const getEventColor = (action: string) => {
    switch (action) {
      case 'BUY':
        return '#10b981'; // green-500
      case 'SELL':
        return '#ef4444'; // red-500
      case 'STOP_LOSS':
        return '#f59e0b'; // amber-500
      default:
        return '#64748b'; // slate-500
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {instrument} Position Timeline
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Price movements and trading events over time
        </p>
      </div>

      <div className="overflow-x-auto">
        <svg width={chartWidth} height={chartHeight} className="border border-slate-200 dark:border-slate-700 rounded-lg">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = margin.top + innerHeight * (1 - ratio);
            return (
              <line
                key={ratio}
                x1={margin.left}
                y1={y}
                x2={margin.left + innerWidth}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth={1}
                strokeDasharray="2,2"
              />
            );
          })}

          {/* Price line */}
          {sortedEvents
            .filter(event => event.price !== undefined)
            .map((event, index, array) => {
              if (index === 0) return null;
              const prevEvent = array[index - 1];
              if (!prevEvent.price || !event.price) return null;
              
              return (
                <line
                  key={`line-${index}`}
                  x1={xScale(prevEvent.timestamp)}
                  y1={yScale(prevEvent.price)}
                  x2={xScale(event.timestamp)}
                  y2={yScale(event.price)}
                  stroke="#3b82f6"
                  strokeWidth={2}
                />
              );
            })}

          {/* Event points */}
          {sortedEvents.map((event, index) => {
            if (event.price === undefined) return null;
            
            return (
              <g key={`event-${index}`}>
                <circle
                  cx={xScale(event.timestamp)}
                  cy={yScale(event.price)}
                  r={6}
                  fill={getEventColor(event.action)}
                  stroke="white"
                  strokeWidth={2}
                />
                <circle
                  cx={xScale(event.timestamp)}
                  cy={yScale(event.price)}
                  r={3}
                  fill="white"
                />
              </g>
            );
          })}

          {/* Y-axis labels (prices) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const price = minPrice - pricePadding + (priceRange + 2 * pricePadding) * (1 - ratio);
            const y = margin.top + innerHeight * (1 - ratio);
            return (
              <text
                key={`price-${ratio}`}
                x={margin.left - 10}
                y={y + 4}
                textAnchor="end"
                className="text-xs fill-slate-600 dark:fill-slate-400"
              >
                ${price.toFixed(2)}
              </text>
            );
          })}

          {/* X-axis labels (dates) */}
          {sortedEvents.map((event, index) => {
            if (index % Math.ceil(sortedEvents.length / 5) !== 0) return null;
            
            return (
              <text
                key={`date-${index}`}
                x={xScale(event.timestamp)}
                y={chartHeight - margin.bottom + 20}
                textAnchor="middle"
                className="text-xs fill-slate-600 dark:fill-slate-400"
              >
                {new Date(event.timestamp).toLocaleDateString()}
              </text>
            );
          })}

          {/* Y-axis label */}
          <text
            x={20}
            y={chartHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90, 20, ${chartHeight / 2})`}
            className="text-sm fill-slate-700 dark:fill-slate-300 font-medium"
          >
            Price ($)
          </text>

          {/* X-axis label */}
          <text
            x={chartWidth / 2}
            y={chartHeight - 10}
            textAnchor="middle"
            className="text-sm fill-slate-700 dark:fill-slate-300 font-medium"
          >
            Time
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 justify-center">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-4 w-4 text-green-600" />
          <span className="text-sm text-slate-600 dark:text-slate-400">Buy</span>
        </div>
        <div className="flex items-center space-x-2">
          <TrendingDown className="h-4 w-4 text-red-600" />
          <span className="text-sm text-slate-600 dark:text-slate-400">Sell</span>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-slate-600 dark:text-slate-400">Stop Loss</span>
        </div>
      </div>

      {/* Event details */}
      <div className="mt-6 space-y-3">
        <h4 className="text-md font-medium text-slate-900 dark:text-slate-100">
          Event Details
        </h4>
        {sortedEvents.map((event, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              {getEventIcon(event.action)}
              <div>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {event.action}
                </span>
                {event.qty && (
                  <span className="text-slate-600 dark:text-slate-400 ml-2">
                    {event.qty} shares
                  </span>
                )}
                {event.price && (
                  <span className="text-slate-600 dark:text-slate-400 ml-2">
                    at ${event.price.toFixed(2)}
                  </span>
                )}
                {event.stop && (
                  <span className="text-slate-600 dark:text-slate-400 ml-2">
                    stop: ${event.stop.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {new Date(event.timestamp).toLocaleDateString()}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-500">
                {new Date(event.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
