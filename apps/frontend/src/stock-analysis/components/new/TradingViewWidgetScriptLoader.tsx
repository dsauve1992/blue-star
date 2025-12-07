import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";

const TradingViewContext = createContext<boolean>(false);

export const TradingViewWidgetScriptLoader = ({
  children,
}: PropsWithChildren) => {
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    const tvScriptLoadingPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.id = "tradingview-widget-loading-script";
      script.src = "https://s3.tradingview.com/tv.js";
      script.type = "text/javascript";
      script.onload = resolve;

      document.head.appendChild(script);
    });

    tvScriptLoadingPromise.then(() => setReady(true));
  }, []);

  return (
    <TradingViewContext.Provider value={ready}>
      {children}
    </TradingViewContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTradingViewContext = () => useContext(TradingViewContext);
