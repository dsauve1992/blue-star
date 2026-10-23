import { useEffect } from "react";
import { useLocation } from "react-router";
import { routes } from "./routes.config";

const APP_NAME = "Blue Star";
const NOT_FOUND_LABEL = "Page not found";

export function useDocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const label =
      routes.find((route) => route.path === pathname)?.label ?? NOT_FOUND_LABEL;
    document.title = `${label} · ${APP_NAME}`;
  }, [pathname]);
}
