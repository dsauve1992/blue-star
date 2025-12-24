import { useState, useRef, useEffect } from 'react';
import { Input, Label } from 'src/global/design-system';
import { useTradingViewSearch } from '../hooks/use-tradingview-search';
import { LoadingSpinner } from 'src/global/design-system';
import { Search } from 'lucide-react';
import type { TradingViewSearchResult } from '../api/tradingview-search.client';

export interface TickerSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: TradingViewSearchResult) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
}

export function TickerSearchInput({
  value,
  onChange,
  onSelect,
  disabled = false,
  placeholder = 'Search for a symbol...',
  label = 'Ticker Symbol',
}: TickerSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [hasSelected, setHasSelected] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: results, isLoading } = useTradingViewSearch(value);

  useEffect(() => {
    if (!hasSelected) {
      setIsOpen(value.length >= 2 && (results?.length ?? 0) > 0);
    }
    setSelectedIndex(-1);
  }, [value, results, hasSelected]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || !results) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev,
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (result: TradingViewSearchResult) => {
    onSelect(result);
    setIsOpen(false);
    setSelectedIndex(-1);
    setHasSelected(true);
  };

  useEffect(() => {
    if (value.length === 0) {
      setHasSelected(false);
    }
  }, [value]);

  const displayResults = results || [];

  return (
    <div className="relative">
      <div>
        <Label htmlFor="ticker-search">{label}</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            ref={inputRef}
            id="ticker-search"
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (!hasSelected && value.length >= 2 && displayResults.length > 0) {
                setIsOpen(true);
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            className="pl-10"
            autoFocus
          />
        </div>
        {isLoading && value.length >= 2 && (
          <div className="absolute right-3 top-9">
            <LoadingSpinner />
          </div>
        )}
      </div>

      {isOpen && displayResults.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {displayResults.map((result, index) => (
            <button
              key={`${result.exchange}-${result.symbol}-${index}`}
              type="button"
              onClick={() => handleSelect(result)}
              className={`w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                index === selectedIndex
                  ? 'bg-slate-100 dark:bg-slate-700'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {result.fullSymbol}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {result.description}
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-500 ml-2">
                  {result.exchange}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {value.length >= 2 && !isLoading && displayResults.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg p-4 text-center text-slate-500 dark:text-slate-400">
          No symbols found
        </div>
      )}
    </div>
  );
}

