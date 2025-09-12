import { Outlet, Route, Routes } from "react-router";
import { AuthProvider } from "./auth/AuthProvider";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import Navigation from "./global/components/Navigation";
import Home from "./global/pages/Home";
import Login from "./auth/Login.tsx";
import Dashboard from "./global/pages/Dashboard";
import Profile from "./global/pages/Profile";
import Settings from "./global/pages/Settings";
import "./App.css";

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
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
