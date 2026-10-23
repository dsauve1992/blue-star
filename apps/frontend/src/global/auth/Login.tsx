import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { Navigate, useLocation } from "react-router";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LoadingSpinner,
} from "../design-system";

export default function Login() {
  const { login, isAuthenticated, isLoading } = useKindeAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isAuthenticated) {
    // Redirect to the page they were trying to access, or dashboard
    const from = location.state?.from?.pathname || "/dashboard";
    return <Navigate to={from} replace />;
  }

  const handleLogin = () => {
    login({
      state: {
        redirectTo: location.state?.from?.pathname || "/dashboard",
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to Blue Star</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-300">
            Sign in to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleLogin} className="w-full">
            Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
