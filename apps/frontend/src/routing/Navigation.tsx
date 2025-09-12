import { Link, useLocation } from "react-router";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { getNavigationRoutes } from "./routes.config";

export default function Navigation() {
  const location = useLocation();
  const { isAuthenticated, logout, user } = useKindeAuth();

  const navItems = getNavigationRoutes(isAuthenticated);

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <h2>Blue Star</h2>
      </div>

      <ul className="nav-links">
        {navItems.map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              className={location.pathname === item.path ? "active" : ""}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="nav-auth">
        {isAuthenticated ? (
          <div className="user-menu">
            <span className="user-name">{user?.givenName || "User"}</span>
            <button onClick={handleLogout} className="btn btn-outline">
              Logout
            </button>
          </div>
        ) : (
          <Link to="/login" className="btn btn-primary">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
