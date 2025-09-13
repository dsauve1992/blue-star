import { Route } from "react-router";
import { ProtectedRoute } from "src/auth/ProtectedRoute";
import { routes } from "src/routing/routes.config";

// Import all page components
import Home from "src/global/pages/Home";
import Login from "src/auth/Login";
import Dashboard from "src/global/pages/Dashboard";
import Profile from "src/global/pages/Profile";
import Settings from "src/global/pages/Settings";

// Map of path to component
const componentMap = {
  "/": Home,
  "/login": Login,
  "/dashboard": Dashboard,
  "/profile": Profile,
  "/settings": Settings,
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
