import { Outlet, Route, Routes } from "react-router";
import { AuthProvider } from "src/global/auth/AuthProvider";
import { ThemeProvider } from "src/global/design-system/theme-provider";
import { TokenProviderSetup } from "src/global/api/token-provider-setup";
import "src/App.css";
import Navigation from "src/global/routing/Navigation";
import { generateRoutes } from "src/global/routing/routeGenerator";
import { AnimatedLayout } from "src/global/design-system/animated-layout";

function Layout() {
  return (
    <div className="app">
      <Navigation />
      <main className="main-content">
        <AnimatedLayout>
          <Outlet />
        </AnimatedLayout>
      </main>
    </div>
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
            </Route>
          </Routes>
        </TokenProviderSetup>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
