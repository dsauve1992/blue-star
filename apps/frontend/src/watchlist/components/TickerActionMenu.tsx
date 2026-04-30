import { useEffect, useRef } from "react";
import { ArrowRight, Copy } from "lucide-react";

interface WatchlistOption {
  id: string;
  name: string;
}

interface TickerActionMenuProps {
  ticker: string;
  otherWatchlists: WatchlistOption[];
  onMove: (targetWatchlistId: string) => void;
  onCopy: (targetWatchlistId: string) => void;
  onClose: () => void;
}

export function TickerActionMenu({
  ticker,
  otherWatchlists,
  onMove,
  onCopy,
  onClose,
}: TickerActionMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-full mt-1 z-50 w-48 rounded-md border border-slate-600/50 bg-slate-900/95 backdrop-blur-xl shadow-lg overflow-hidden"
    >
      <div className="px-2 py-1.5 border-b border-slate-700/50">
        <span className="text-[10px] uppercase tracking-wide text-slate-500">
          {ticker}
        </span>
      </div>

      {otherWatchlists.length === 0 ? (
        <div className="px-2 py-2 text-[11px] text-slate-400">
          No other watchlists
        </div>
      ) : (
        <>
          <MenuSection
            label="Move to"
            icon={<ArrowRight className="w-3 h-3" />}
            options={otherWatchlists}
            onSelect={(id) => {
              onMove(id);
              onClose();
            }}
          />
          <div className="border-t border-slate-700/50" />
          <MenuSection
            label="Copy to"
            icon={<Copy className="w-3 h-3" />}
            options={otherWatchlists}
            onSelect={(id) => {
              onCopy(id);
              onClose();
            }}
          />
        </>
      )}
    </div>
  );
}

interface MenuSectionProps {
  label: string;
  icon: React.ReactNode;
  options: WatchlistOption[];
  onSelect: (id: string) => void;
}

function MenuSection({ label, icon, options, onSelect }: MenuSectionProps) {
  return (
    <div className="py-1">
      <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </div>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(option.id);
          }}
          className="w-full text-left px-2 py-1.5 text-xs text-slate-200 hover:bg-slate-700/50 transition-colors truncate"
        >
          {option.name}
        </button>
      ))}
    </div>
  );
}
