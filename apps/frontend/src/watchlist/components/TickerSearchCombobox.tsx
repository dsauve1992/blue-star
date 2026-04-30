import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useTradingViewSearch } from "../hooks/use-tradingview-search";
import type { TradingViewSearchResult } from "../api/tradingview-search.client";

const DEBOUNCE_MS = 250;
const MAX_RESULTS = 8;

function getTickerLogoUrl(symbol: string): string {
  return `https://images.financialmodelingprep.com/symbol/${symbol}.png`;
}

interface TickerSearchComboboxProps {
  isAddingTicker: boolean;
  onAddTicker: (ticker: string) => Promise<void>;
}

export function TickerSearchCombobox({
  isAddingTicker,
  onAddTicker,
}: TickerSearchComboboxProps) {
  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedQuery(inputValue.trim());
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [inputValue]);

  const { data, isFetching } = useTradingViewSearch(debouncedQuery);

  const results = useMemo(
    () => (data ?? []).slice(0, MAX_RESULTS),
    [data],
  );

  useEffect(() => {
    setHighlightedIndex(0);
  }, [results]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const submitFreeText = async () => {
    const value = inputValue.trim().toUpperCase();
    if (!value) return;
    await onAddTicker(value);
    setInputValue("");
    setIsOpen(false);
  };

  const submitResult = async (result: TradingViewSearchResult) => {
    await onAddTicker(result.fullSymbol);
    setInputValue("");
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOpen && results.length > 0) {
      await submitResult(results[highlightedIndex] ?? results[0]);
    } else {
      await submitFreeText();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length === 0) return;
      setIsOpen(true);
      setHighlightedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length === 0) return;
      setIsOpen(true);
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const showDropdown =
    isOpen &&
    inputValue.trim().length >= 2 &&
    (isFetching || results.length > 0);

  return (
    <div ref={containerRef} className="relative">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-1.5"
      >
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search ticker..."
            maxLength={50}
            disabled={isAddingTicker}
            autoComplete="off"
            className="w-full pl-7 pr-2 py-1.5 rounded-md text-xs bg-slate-900/50 border border-slate-600/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={!inputValue.trim() || isAddingTicker}
          className="p-1.5 rounded-md bg-blue-600/50 text-white hover:bg-blue-600/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-md border border-slate-600/50 bg-slate-900/95 backdrop-blur-xl shadow-lg max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
          {isFetching && results.length === 0 && (
            <div className="px-2 py-2 text-[11px] text-slate-400">
              Searching...
            </div>
          )}
          {results.map((result, index) => (
            <SearchResultRow
              key={`${result.fullSymbol}-${index}`}
              result={result}
              isHighlighted={index === highlightedIndex}
              onMouseEnter={() => setHighlightedIndex(index)}
              onSelect={() => void submitResult(result)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SearchResultRowProps {
  result: TradingViewSearchResult;
  isHighlighted: boolean;
  onMouseEnter: () => void;
  onSelect: () => void;
}

function SearchResultRow({
  result,
  isHighlighted,
  onMouseEnter,
  onSelect,
}: SearchResultRowProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = getTickerLogoUrl(result.symbol);

  return (
    <button
      type="button"
      onMouseDown={(e) => {
        // mousedown so we fire before the input's onBlur closes the dropdown
        e.preventDefault();
        onSelect();
      }}
      onMouseEnter={onMouseEnter}
      className={`w-full flex items-center gap-2 px-2 py-1.5 text-left transition-colors ${
        isHighlighted ? "bg-slate-700/50" : "hover:bg-slate-700/30"
      }`}
    >
      <div
        className={`flex items-center justify-center w-6 h-6 rounded overflow-hidden flex-shrink-0 ${
          isHighlighted ? "bg-slate-600" : "bg-slate-700"
        }`}
      >
        {logoFailed ? (
          <span className="font-semibold text-[9px] text-slate-300">
            {result.symbol.slice(0, 3)}
          </span>
        ) : (
          <img
            src={logoUrl}
            alt={result.symbol}
            className="w-full h-full object-contain p-0.5"
            onError={() => setLogoFailed(true)}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-white">
            {result.displaySymbol}
          </span>
          {result.exchange && (
            <span className="text-[9px] text-slate-500 uppercase tracking-wide">
              {result.exchange}
            </span>
          )}
        </div>
        {result.description && (
          <p className="text-[10px] text-slate-400 truncate">
            {result.description}
          </p>
        )}
      </div>
    </button>
  );
}
