import { Link, useLocation } from "react-router";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { getNavigationRoutes } from "src/routing/routes.config";
import { Button } from "src/design-system/button";
import { ThemeToggle } from "src/design-system/theme-toggle";
import { TrendingUp, User, LogOut } from "lucide-react";
import { motion } from "framer-motion";

export default function Navigation() {
  const location = useLocation();
  const { isAuthenticated, logout, user } = useKindeAuth();

  const navItems = getNavigationRoutes(isAuthenticated);

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link to="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-md flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-50">Blue Star</span>
          </Link>

          <ul className="hidden md:flex items-center space-x-1">
            {navItems.map((item, index) => (
              <motion.li 
                key={item.path}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? "bg-primary-600 text-white"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {item.label}
                </Link>
              </motion.li>
            ))}
          </ul>
        </div>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          {isAuthenticated ? (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm">
                <User className="h-4 w-4 text-slate-300 dark:text-slate-300" />
                <span className="text-slate-300 dark:text-slate-300">
                  {user?.givenName || "User"}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          ) : (
            <Button asChild>
              <Link to="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
