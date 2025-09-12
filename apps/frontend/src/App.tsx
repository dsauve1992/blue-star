import { Outlet, Route, Routes } from "react-router";
import { AuthProvider } from "./auth/AuthProvider";
import "./App.css";
import Navigation from "./routing/Navigation";
import { generateRoutes } from "./routing/routeGenerator";

function Layout() {
  return (
    <div className="app">
      <Navigation />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          {generateRoutes()}
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
