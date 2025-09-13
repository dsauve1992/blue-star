import { StrictMode } from "react";
import "src/index.css";
import App from "src/App.tsx";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

const root = document.getElementById("root");

createRoot(root!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
