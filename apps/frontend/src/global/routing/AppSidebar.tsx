import { Link, useLocation } from "react-router";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { getNavigationRoutes } from "./routes.config";
import { ThemeToggle } from "../design-system/theme-toggle";
import {
  Home,
  LayoutDashboard,
  Briefcase,
  BarChart3,
  Bookmark,
  PieChart,
  Settings,
  User,
  LogOut,
  LogIn,
  TrendingUp,
} from "lucide-react";

const MAIN_NAV_BASE = [
  "/dashboard",
  "/positions",
  "/stock-analysis",
  "/watchlists",
  "/sector-rotation",
] as const;

const PATH_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "/": Home,
  "/dashboard": LayoutDashboard,
  "/positions": Briefcase,
  "/stock-analysis": BarChart3,
  "/watchlists": Bookmark,
  "/sector-rotation": PieChart,
  "/settings": Settings,
  "/profile": User,
};

function getBasePath(path: string): string {
  return path.replace(/\/:[^/]+/g, "");
}

function getIcon(path: string) {
  const base = getBasePath(path);
  return PATH_ICON[base] ?? null;
}

function isActive(itemPath: string, pathname: string): boolean {
  const base = getBasePath(itemPath);
  if (base === "/") return pathname === "/";
  return pathname === base || pathname.startsWith(base + "/");
}

function getHref(item: { path: string; navigationPath?: string }): string {
  return item.navigationPath ?? item.path;
}

export default function AppSidebar() {
  const location = useLocation();
  const { isAuthenticated, logout, user } = useKindeAuth();
  const navItems = getNavigationRoutes(isAuthenticated);

  const mainNav = navItems.filter(
    (r) =>
      r.path !== "/" &&
      r.path !== "/profile" &&
      r.path !== "/settings" &&
      MAIN_NAV_BASE.some((b) => getBasePath(r.path) === b),
  );
  mainNav.sort(
    (a, b) =>
      MAIN_NAV_BASE.indexOf(getBasePath(a.path) as (typeof MAIN_NAV_BASE)[number]) -
      MAIN_NAV_BASE.indexOf(getBasePath(b.path) as (typeof MAIN_NAV_BASE)[number]),
  );

  const settingsItem = navItems.find((r) => getBasePath(r.path) === "/settings");

  return (
    <aside
      className="w-14 flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/95"
      aria-label="Main navigation"
    >
      <div className="flex flex-col items-center py-3 gap-1">
        <Link
          to="/"
          className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-50 transition-colors"
          title="Home"
        >
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
        </Link>
      </div>

      <nav className="flex flex-col items-center py-2 gap-0.5">
        {mainNav.map((item) => {
          const Icon = getIcon(item.path);
          if (!Icon) return null;
          const active = isActive(item.path, location.pathname);
          return (
            <Link
              key={item.path}
              to={getHref(item)}
              title={item.label}
              className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                active
                  ? "bg-slate-200 dark:bg-slate-700/80 text-blue-600 dark:text-blue-400 border-l-2 border-l-blue-500 dark:border-l-blue-400"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
      </nav>

      {settingsItem && (
        <div className="flex flex-col items-center pt-2 border-t border-slate-200 dark:border-slate-700/80">
          <Link
            to={getHref(settingsItem)}
            title={settingsItem.label}
            className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
              isActive(settingsItem.path, location.pathname)
                ? "bg-slate-200 dark:bg-slate-700/80 text-blue-600 dark:text-blue-400"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50"
            }`}
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      )}

      <div className="flex-1 min-h-4" />

      <div className="flex flex-col items-center py-2 gap-0.5 border-t border-slate-200 dark:border-slate-700/80">
        <span className="flex items-center justify-center w-10 h-10 [&_button]:!w-10 [&_button]:!h-10 [&_button]:!p-0 [&_button]:!min-w-0 [&_button]:rounded-lg">
          <ThemeToggle />
        </span>
        {isAuthenticated ? (
          <>
            <Link
              to="/profile"
              title={user?.givenName || "Profile"}
              className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <User className="w-5 h-5" />
            </Link>
            <button
              onClick={() => logout()}
              title="Log out"
              className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </>
        ) : (
          <Link
            to="/login"
            title="Log in"
            className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <LogIn className="w-5 h-5" />
          </Link>
        )}
      </div>
    </aside>
  );
}
