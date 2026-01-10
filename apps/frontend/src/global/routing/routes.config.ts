export interface RouteConfig {
  path: string;
  label: string;
  isProtected: boolean;
  showInNavigation: boolean;
  navigationPath?: string;
}

export const routes: RouteConfig[] = [
  {
    path: "/",
    label: "Home",
    isProtected: false,
    showInNavigation: true,
  },
  {
    path: "/login",
    label: "Login",
    isProtected: false,
    showInNavigation: false,
  },
  {
    path: "/dashboard",
    label: "Dashboard",
    isProtected: true,
    showInNavigation: true,
  },
  {
    path: "/profile",
    label: "Profile",
    isProtected: true,
    showInNavigation: true,
  },
  {
    path: "/settings",
    label: "Settings",
    isProtected: true,
    showInNavigation: true,
  },
  {
    path: "/positions",
    label: "Positions",
    isProtected: true,
    showInNavigation: true,
  },
  {
    path: "/positions/:positionId",
    label: "Position Detail",
    isProtected: true,
    showInNavigation: false,
  },
  {
    path: "/stock-analysis/:type",
    label: "Stock Analysis",
    isProtected: true,
    showInNavigation: true,
    navigationPath: "/stock-analysis/daily",
  },
  {
    path: "/watchlists",
    label: "Watchlists",
    isProtected: true,
    showInNavigation: true,
  },
  {
    path: "/sector-rotation",
    label: "Sector Rotation",
    isProtected: true,
    showInNavigation: true,
  },
];

export const getPublicRoutes = () =>
  routes.filter((route) => !route.isProtected);
export const getProtectedRoutes = () =>
  routes.filter((route) => route.isProtected);
export const getNavigationRoutes = (isAuthenticated: boolean) =>
  routes.filter(
    (route) =>
      route.showInNavigation && (!route.isProtected || isAuthenticated),
  );
