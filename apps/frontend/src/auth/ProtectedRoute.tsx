import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { Navigate, Route, type RouteProps, useLocation } from "react-router";

export function ProtectedRoute({ path, element }: RouteProps) {
  const { isAuthenticated, isLoading } = useKindeAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Route
        path={path}
        element={
          <div className="loading-container">
            <div className="loading-spinner">Loading...</div>
          </div>
        }
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <Route
        path={path}
        element={<Navigate to="/login" state={{ from: location }} replace />}
      />
    );
  }

  return <Route path={path} element={element} />;
}
