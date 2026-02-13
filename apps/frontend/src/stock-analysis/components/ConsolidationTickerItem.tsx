import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { ConsolidationResult } from "../api/consolidation.client";
import type { SectorStatus } from "src/sector-rotation/api/sector-rotation.client";
import type { SectorFilterMode } from "../hooks/use-consolidation-selection";
import { getSectorQuadrant, getQuadrantColor } from "../utils/sector-utils";

function extractSymbol(ticker: string): string {
  const parts = ticker.split(":");
  return parts.length > 1 ? parts[1] : parts[0];
}

function getTickerLogoUrl(symbol: string): string {
  return `https://images.financialmodelingprep.com/symbol/${symbol}.png`;
}

interface ConsolidationTickerItemProps {
  consolidation: ConsolidationResult;
  isSelected: boolean;
  sectorFilterMode: SectorFilterMode;
  sectorStatuses: SectorStatus[];
  onSelect: (tickerFullName: string) => void;
}

export function ConsolidationTickerItem({
  consolidation,
  isSelected,
  sectorFilterMode,
  sectorStatuses,
  onSelect,
}: ConsolidationTickerItemProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const symbol = extractSymbol(consolidation.symbol);
  const logoUrl = getTickerLogoUrl(symbol);
  const sectorQuadrant = getSectorQuadrant(
    consolidation.sector,
    sectorStatuses,
  );
  const isInFavorableSector =
    sectorQuadrant === "Leading" || sectorQuadrant === "Improving";
  const shouldHighlight =
    sectorFilterMode === "highlight" && isInFavorableSector;

  return (
    <div
      onClick={() => onSelect(consolidation.tickerFullName)}
      className={`
        group relative flex items-center overflow-hidden rounded-lg cursor-pointer
        transition-all duration-200 ease-out
        ${
          isSelected
            ? "border border-blue-500/50 shadow-md shadow-blue-500/10"
            : shouldHighlight
              ? "border border-emerald-500/30 hover:border-emerald-400/50"
              : "border border-transparent hover:border-slate-600/50"
        }
      `}
    >
      {/* Company logo as card background */}
      {!logoFailed ? (
        <>
          <img
            src={logoUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none"
            onError={() => setLogoFailed(true)}
          />
          <div
            className={`absolute inset-0 pointer-events-none ${
              isSelected
                ? "bg-gradient-to-r from-slate-900 via-slate-900/92 to-blue-900/40"
                : shouldHighlight
                  ? "bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-900/50"
                  : "bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-800/70"
            }`}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-slate-800 flex items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-slate-600/40 select-none">
            {symbol.slice(0, 3)}
          </span>
        </div>
      )}

      {/* Ticker Info */}
      <div className="relative z-10 flex-1 min-w-0 p-2">
        <div className="flex items-center gap-1 flex-wrap">
          <span
            className={`font-semibold text-xs truncate ${isSelected ? "text-white" : "text-slate-100"}`}
          >
            {consolidation.symbol}
          </span>
          {consolidation.isNew && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Sparkles className="w-2.5 h-2.5 flex-shrink-0" />
              New
            </span>
          )}
        </div>
        <span className="text-[10px] text-slate-400 truncate block">
          {consolidation.tickerFullName}
        </span>
        <div className="flex flex-wrap gap-0.5 mt-1">
          {consolidation.sector && sectorQuadrant && (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getQuadrantColor(sectorQuadrant)}`}
            >
              {sectorQuadrant}
            </span>
          )}
          {consolidation.themes && consolidation.themes.length > 0 && (
            <>
              {consolidation.themes.slice(0, 1).map((theme) => (
                <span
                  key={theme}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 truncate max-w-[80px]"
                >
                  {theme}
                </span>
              ))}
              {consolidation.themes.length > 1 && (
                <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-slate-700/50 text-slate-400 border border-slate-600/50">
                  +{consolidation.themes.length - 1}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-1 h-5 bg-gradient-to-b from-blue-400 to-purple-500 rounded-l-full" />
      )}
    </div>
  );
}
