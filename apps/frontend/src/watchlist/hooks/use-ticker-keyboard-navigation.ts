import { useEffect, type RefObject } from "react";

interface UseTickerKeyboardNavigationParams {
  tickers: string[];
  selectedTicker: string | null;
  onTickerChange: (ticker: string) => void;
  tickerRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  listContainerRef: RefObject<HTMLDivElement | null>;
}

export function useTickerKeyboardNavigation({
  tickers,
  selectedTicker,
  onTickerChange,
  tickerRefs,
  listContainerRef,
}: UseTickerKeyboardNavigationParams) {
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

        const newTicker = tickers[newIndex];
        onTickerChange(newTicker);

        const tickerElement = tickerRefs.current.get(newTicker);
        if (tickerElement && listContainerRef.current) {
          tickerElement.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [tickers, selectedTicker, onTickerChange, tickerRefs, listContainerRef]);
}
