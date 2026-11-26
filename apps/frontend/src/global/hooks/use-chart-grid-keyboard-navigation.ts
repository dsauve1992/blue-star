import { useEffect } from "react";

const ARROW_KEYS = ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"] as const;

type ArrowKey = (typeof ARROW_KEYS)[number];

const TWO_COLUMN_MEDIA_QUERY = "(min-width: 768px)";

function isArrowKey(key: string): key is ArrowKey {
  return (ARROW_KEYS as readonly string[]).includes(key);
}

function groupStart(groups: string[][], group: number): number {
  return groups.slice(0, group).reduce((sum, g) => sum + g.length, 0);
}

function verticalTarget(
  groups: string[][],
  current: number,
  step: 1 | -1,
): number | null {
  let group = 0;
  let index = current;
  while (index >= groups[group].length) {
    index -= groups[group].length;
    group++;
  }

  const sameGroupIndex = index + step * 2;
  if (sameGroupIndex >= 0 && sameGroupIndex < groups[group].length) {
    return groupStart(groups, group) + sameGroupIndex;
  }

  const adjacent = group + step;
  if (adjacent < 0 || adjacent >= groups.length) return null;

  const lastIndex = groups[adjacent].length - 1;
  const row = step === 1 ? 0 : lastIndex - (lastIndex % 2);
  return groupStart(groups, adjacent) + Math.min(row + (index % 2), lastIndex);
}

export function resolveNextTicker(
  groups: string[][],
  selectedTicker: string | null,
  key: ArrowKey,
  columns: 1 | 2,
): string | null {
  const tickers = groups.flat();
  if (tickers.length === 0) return null;

  const current =
    selectedTicker === null ? -1 : tickers.indexOf(selectedTicker);
  if (current === -1) return tickers[0];

  const step = key === "ArrowDown" || key === "ArrowRight" ? 1 : -1;
  const isVertical = key === "ArrowDown" || key === "ArrowUp";
  const move = (from: number) =>
    isVertical && columns === 2
      ? verticalTarget(groups, from, step)
      : from + step;

  let target = move(current);
  while (
    target !== null &&
    target >= 0 &&
    target < tickers.length &&
    tickers.indexOf(tickers[target]) !== target
  ) {
    target = move(target);
  }

  return target !== null && target >= 0 && target < tickers.length
    ? tickers[target]
    : null;
}

interface UseChartGridKeyboardNavigationParams {
  tickerGroups: string[][];
  selectedTicker: string | null;
  onTickerChange: (ticker: string) => void;
}

export function useChartGridKeyboardNavigation({
  tickerGroups,
  selectedTicker,
  onTickerChange,
}: UseChartGridKeyboardNavigationParams) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "SELECT" ||
          activeEl.tagName === "TEXTAREA")
      ) {
        return;
      }

      if (tickerGroups.length === 0) return;

      if (isArrowKey(event.key)) {
        event.preventDefault();

        const columns = window.matchMedia(TWO_COLUMN_MEDIA_QUERY).matches
          ? 2
          : 1;
        const next = resolveNextTicker(
          tickerGroups,
          selectedTicker,
          event.key,
          columns,
        );
        if (next !== null) onTickerChange(next);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [tickerGroups, selectedTicker, onTickerChange]);
}
