import { Route } from "react-router";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { routes } from "./routes.config";

// Import all page components
import Home from "../pages/Home";
import Login from "../auth/Login";
import Dashboard from "../pages/Dashboard";
import Profile from "../pages/Profile";
import Settings from "../pages/Settings";
import Position from "../../position/pages/Position";

// Map of path to component
const componentMap = {
  "/": Home,
  "/login": Login,
  "/dashboard": Dashboard,
  "/profile": Profile,
  "/settings": Settings,
  "/positions": Position,
} as const;

export function generateRoutes() {
  return routes
    .map((route) => {
      const Component = componentMap[route.path as keyof typeof componentMap];

      if (!Component) {
        console.warn(`No component found for route: ${route.path}`);
      }

      if (route.isProtected) {
        return (
          <Route
            key={route.path}
            path={route.path}
            element={
              <ProtectedRoute>
                <Component />
              </ProtectedRoute>
            }
          />
        );
      }

      return (
        <Route key={route.path} path={route.path} element={<Component />} />
      );
    })
    .filter(Boolean);
}
