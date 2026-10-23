import { Outlet, Route, Routes } from "react-router";
import { AuthProvider } from "src/global/auth/AuthProvider";
import { ThemeProvider } from "src/global/design-system/theme-provider";
import { TokenProviderSetup } from "src/global/api/token-provider-setup";
import "src/App.css";
import AppSidebar from "src/global/routing/AppSidebar";
import { generateRoutes } from "src/global/routing/routeGenerator";
import { useDocumentTitle } from "src/global/routing/useDocumentTitle";
import { AnimatedLayout } from "src/global/design-system/animated-layout";
import NotFound from "src/global/pages/NotFound";
import { MarketHealthBar } from "src/market-health/components/MarketHealthBar";

function Layout() {
  useDocumentTitle();

  return (
    <>
      <MarketHealthBar />
      <div className="app">
        <AppSidebar />
        <main className="main-content">
          <AnimatedLayout>
            <Outlet />
          </AnimatedLayout>
        </main>
      </div>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TokenProviderSetup>
          <Routes>
            <Route path="/" element={<Layout />}>
              {generateRoutes()}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </TokenProviderSetup>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
