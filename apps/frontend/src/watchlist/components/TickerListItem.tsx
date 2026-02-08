import { useState } from "react";
import { X } from "lucide-react";

function extractSymbol(ticker: string): string {
  const parts = ticker.split(":");
  return parts.length > 1 ? parts[1] : parts[0];
}

function getTickerLogoUrl(symbol: string): string {
  return `https://images.financialmodelingprep.com/symbol/${symbol}.png`;
}

interface TickerListItemProps {
  ticker: string;
  isSelected: boolean;
  onSelect: (ticker: string) => void;
  onRemove: (ticker: string) => void;
}

export function TickerListItem({
  ticker,
  isSelected,
  onSelect,
  onRemove,
}: TickerListItemProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const symbol = extractSymbol(ticker);
  const logoUrl = getTickerLogoUrl(symbol);

  return (
    <div
      onClick={() => onSelect(ticker)}
      className={`
        group relative flex items-center gap-2 px-2 py-1.5 cursor-pointer
        transition-colors duration-150
        ${
          isSelected
            ? "bg-slate-700/50 border-l-2 border-l-blue-500"
            : "hover:bg-slate-700/30 border-l-2 border-l-transparent"
        }
      `}
    >
      <div
        className={`
        flex items-center justify-center w-6 h-6 rounded overflow-hidden flex-shrink-0
        ${isSelected ? "bg-slate-600" : "bg-slate-700"}
      `}
      >
        {logoFailed ? (
          <span className="font-semibold text-[9px] text-slate-300">
            {symbol.slice(0, 3)}
          </span>
        ) : (
          <img
            src={logoUrl}
            alt={symbol}
            className="w-full h-full object-contain p-0.5"
            onError={() => setLogoFailed(true)}
          />
        )}
      </div>

      <span
        className={`text-xs font-medium truncate flex-1 ${isSelected ? "text-white" : "text-slate-300"}`}
      >
        {ticker}
      </span>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(ticker);
        }}
        className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-600/50 text-slate-500 hover:text-red-400 transition-all flex-shrink-0"
        aria-label={`Remove ${ticker}`}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
