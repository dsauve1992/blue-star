import { useState } from "react";

function getTickerLogoUrl(symbol: string): string {
  return `https://images.financialmodelingprep.com/symbol/${symbol}.png`;
}

function getRsRatingColor(rsRating: number): string {
  if (rsRating >= 80)
    return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (rsRating >= 50)
    return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-slate-500/20 text-slate-400 border-slate-500/30";
}

interface IndustryGroupListItemProps {
  symbol: string;
  rsRating: number;
  rank: number;
  isSelected: boolean;
  onSelect: (symbol: string) => void;
}

export function IndustryGroupListItem({
  symbol,
  rsRating,
  rank,
  isSelected,
  onSelect,
}: IndustryGroupListItemProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = getTickerLogoUrl(symbol);

  return (
    <div
      onClick={() => onSelect(symbol)}
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
      <span className="text-[10px] tabular-nums text-slate-500 w-6 text-right flex-shrink-0">
        {rank}
      </span>

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
        className={`text-xs font-medium truncate flex-1 ${
          isSelected ? "text-white" : "text-slate-300"
        }`}
      >
        {symbol}
      </span>

      <span
        className={`inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium border flex-shrink-0 ${getRsRatingColor(
          rsRating,
        )}`}
        title="Industry-group RS rating (1-99)"
      >
        IG {rsRating}
      </span>
    </div>
  );
}
