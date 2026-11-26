import { RefreshCw } from "lucide-react";
import { Button } from "src/global/design-system";

interface ChartLoadErrorProps {
  symbol: string;
  onRetry: () => void;
}

export function ChartLoadError({ symbol, onRetry }: ChartLoadErrorProps) {
  return (
    <div className="pointer-events-none relative z-20 h-full flex flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm text-red-400">Couldn't load the {symbol} chart.</p>
      <Button
        variant="outline"
        size="sm"
        className="pointer-events-auto text-slate-200"
        onClick={onRetry}
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Retry
      </Button>
    </div>
  );
}
