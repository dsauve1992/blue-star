import { StrictMode } from "react";
import "./index.css";
import App from "./App.tsx";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";

const root = document.getElementById("root");

createRoot(root!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
