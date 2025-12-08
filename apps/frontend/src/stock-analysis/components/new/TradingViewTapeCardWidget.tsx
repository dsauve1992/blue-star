import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { useTradingViewContext } from "src/stock-analysis/components/new/TradingViewWidgetScriptLoader.tsx";

type TradingViewTapeCardProps = {
  exchange: string;
  symbol: string;
  interval?: "D" | "15" | "60" | "W";
  range?: "1m" | "3m" | "6m" | "12m" | "5d" | "1d" | "3Y" | "60m";
  movingAverages?: { type: "EMA" | "SMA"; length: number }[];
  withDateRanges?: boolean;
  hideTopToolbar?: boolean;
};

function TradingViewTapeCardWidget({
  exchange,
  symbol,
  interval = "D",
  range = "12m",
  withDateRanges = true,
  hideTopToolbar = false,
  movingAverages = [],
}: TradingViewTapeCardProps) {
  const tradingViewReady = useTradingViewContext();
  const containerId = useMemo(
    () => `tradingview_${symbol}_${interval}`,
    [interval, symbol],
  );
  const onLoadScriptRef = useRef<() => void>(null);

  const studies = useMemo(
    () =>
      movingAverages.map(({ type, length }) => ({
        id:
          type === "SMA" ? "MASimple@tv-basicstudies" : "MAExp@tv-basicstudies",
        version: 60,
        inputs: {
          length,
        },
      })),
    [movingAverages],
  );

  const createWidget = useCallback(() => {
    if ("TradingView" in window) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore

      return new window.TradingView.widget({
        autosize: true,
        symbol: `${exchange}:${symbol}`,
        interval,
        range,
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#f1f3f6",
        enable_publishing: false,
        withdateranges: withDateRanges,
        hide_top_toolbar: hideTopToolbar,
        fullscreen: true,
        studies,
        hide_side_toolbar: true,
        allow_symbol_change: false,
        details: false,
        hotlist: false,
        calendar: false,
        container_id: containerId,
      });
    }

    return null;
  }, [
    containerId,
    exchange,
    hideTopToolbar,
    interval,
    range,
    studies,
    symbol,
    withDateRanges,
  ]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    onLoadScriptRef.current = createWidget;
    onLoadScriptRef.current();

    return () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      onLoadScriptRef.current = null;
    };
  }, [createWidget, symbol, tradingViewReady]);

  return <div id={containerId} style={{ height: "100%" }} />;
}

export default memo(TradingViewTapeCardWidget);
