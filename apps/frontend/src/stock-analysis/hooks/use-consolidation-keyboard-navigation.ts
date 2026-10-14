import { useEffect } from "react";

interface UseConsolidationKeyboardNavigationParams {
  tickers: string[];
  selectedTicker: string | null;
  onTickerChange: (ticker: string) => void;
}

export function useConsolidationKeyboardNavigation({
  tickers,
  selectedTicker,
  onTickerChange,
}: UseConsolidationKeyboardNavigationParams) {
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

      if (tickers.length === 0) return;

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();

        const currentIndex = tickers.findIndex((t) => t === selectedTicker);

        if (currentIndex === -1) {
          onTickerChange(tickers[0]);
          return;
        }

        let newIndex: number;
        if (event.key === "ArrowDown") {
          newIndex = Math.min(currentIndex + 1, tickers.length - 1);
        } else {
          newIndex = Math.max(currentIndex - 1, 0);
        }

        onTickerChange(tickers[newIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [tickers, selectedTicker, onTickerChange]);
}
