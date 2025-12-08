import { StrictMode } from "react";
import "src/index.css";
import App from "src/App.tsx";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "src/global/api/query-client";
import { TradingViewWidgetScriptLoader } from "src/stock-analysis/components/new/TradingViewWidgetScriptLoader.tsx";

const root = document.getElementById("root");

createRoot(root!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TradingViewWidgetScriptLoader>
          <App />
        </TradingViewWidgetScriptLoader>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
);
