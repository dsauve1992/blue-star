import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { useLocation, Navigate } from 'react-router';

export default function Login() {
  const { login, register, isAuthenticated, isLoading } = useKindeAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    // Redirect to the page they were trying to access, or dashboard
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  const handleLogin = () => {
    login({
      state: {
        redirectTo: location.state?.from?.pathname || '/dashboard',
      },
    });
  };

  const handleRegister = () => {
    register({
      state: {
        redirectTo: location.state?.from?.pathname || '/dashboard',
      },
    });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Welcome to Blue Star</h1>
        <p>Sign in to access your portfolio</p>
        
        <div className="login-buttons">
          <button onClick={handleLogin} className="btn btn-primary">
            Sign In
          </button>
          <button onClick={handleRegister} className="btn btn-secondary">
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}
