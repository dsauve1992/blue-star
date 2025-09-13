import { Outlet, Route, Routes } from "react-router";
import { AuthProvider } from "src/auth/AuthProvider";
import { ThemeProvider } from "src/design-system/theme-provider";
import { TokenProviderSetup } from "src/api/token-provider-setup";
import "src/App.css";
import Navigation from "src/routing/Navigation";
import { generateRoutes } from "src/routing/routeGenerator";
import { AnimatedLayout } from "src/design-system/animated-layout";

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
