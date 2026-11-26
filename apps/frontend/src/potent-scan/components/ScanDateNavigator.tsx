import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "src/global/design-system";

interface ScanDateNavigatorProps {
  scanDates: string[];
  scanDate: string;
  onScanDateChange: (scanDate: string) => void;
}

function formatScanDate(scanDate: string): string {
  return new Date(`${scanDate}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function ScanDateNavigator({
  scanDates,
  scanDate,
  onScanDateChange,
}: ScanDateNavigatorProps) {
  const index = scanDates.indexOf(scanDate);
  const previous = scanDates[index + 1];
  const next = index > 0 ? scanDates[index - 1] : undefined;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        aria-label="Previous scan"
        disabled={!previous}
        onClick={() => previous && onScanDateChange(previous)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-36 text-center text-sm font-medium tabular-nums text-slate-900 dark:text-slate-100">
        {formatScanDate(scanDate)}
      </span>
      <Button
        variant="outline"
        size="icon"
        aria-label="Next scan"
        disabled={!next}
        onClick={() => next && onScanDateChange(next)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
