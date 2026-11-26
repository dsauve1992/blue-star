import type { ReactNode, RefObject } from "react";

interface ChartGridCardFrameProps {
  cardRef: RefObject<HTMLDivElement | null>;
  symbol: string;
  tickerId: string;
  header: ReactNode;
  isSelected: boolean;
  onOpen: (tickerId: string) => void;
  children: ReactNode;
}

export function ChartGridCardFrame({
  cardRef,
  symbol,
  tickerId,
  header,
  isSelected,
  onOpen,
  children,
}: ChartGridCardFrameProps) {
  return (
    <div
      ref={cardRef}
      data-ticker={tickerId}
      className={`flex flex-col h-80 scroll-mt-12 rounded-xl overflow-hidden border bg-slate-800/30 transition-colors duration-150 ${
        isSelected
          ? "border-blue-400 ring-1 ring-blue-400/60"
          : "border-slate-700/50 hover:border-blue-500/50"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-700/50 text-xs">
        {header}
      </div>
      <div className="relative flex-1 min-h-0">
        {children}
        <button
          type="button"
          onClick={() => onOpen(tickerId)}
          aria-pressed={isSelected}
          className="absolute inset-0 z-10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400"
          aria-label={`Open ${symbol} chart`}
        />
      </div>
    </div>
  );
}
