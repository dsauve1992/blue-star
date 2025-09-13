import { Outlet, Route, Routes } from "react-router";
import { AuthProvider } from "./auth/AuthProvider";
import { ThemeProvider } from "./design-system/theme-provider";
import { TokenProviderSetup } from "./api/token-provider-setup";
import "./App.css";
import Navigation from "./routing/Navigation";
import { generateRoutes } from "./routing/routeGenerator";
import { AnimatedLayout } from "./design-system/animated-layout";

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
