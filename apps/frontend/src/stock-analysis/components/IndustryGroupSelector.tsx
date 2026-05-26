import { useMemo, useRef, useState, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { IndustryGroupSummaryDto } from "../api/industry-group.client";

interface IndustryGroupSelectorProps {
  groups: IndustryGroupSummaryDto[];
  selectedGroup: string | null;
  isLoading: boolean;
  onSelect: (group: string) => void;
}

export function IndustryGroupSelector({
  groups,
  selectedGroup,
  isLoading,
  onSelect,
}: IndustryGroupSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    } else {
      setSearch("");
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) =>
      g.industryGroup.toLowerCase().includes(q),
    );
  }, [groups, search]);

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        disabled={isLoading || groups.length === 0}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-700/50 bg-slate-800/50 hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed text-left transition-colors"
      >
        <span className="truncate text-sm text-slate-200">
          {selectedGroup ??
            (isLoading
              ? "Loading industry groups..."
              : groups.length === 0
                ? "No industry groups available"
                : "Select an industry group")}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full max-h-96 overflow-hidden rounded-lg border border-slate-700/50 bg-slate-900/95 backdrop-blur-xl shadow-2xl flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/50">
            <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter groups..."
              className="flex-1 bg-transparent text-xs text-slate-200 placeholder:text-slate-500 outline-none"
            />
          </div>
          <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-xs text-slate-500 text-center">
                No matches
              </div>
            )}
            {filtered.map((g) => (
              <button
                key={g.industryGroup}
                onClick={() => {
                  onSelect(g.industryGroup);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-slate-700/50 transition-colors ${
                  selectedGroup === g.industryGroup
                    ? "bg-slate-700/40 text-white"
                    : "text-slate-300"
                }`}
              >
                <span className="truncate">{g.industryGroup}</span>
                <span className="tabular-nums text-[10px] text-slate-500 flex-shrink-0">
                  {g.memberCount}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
