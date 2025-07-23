import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LoginPage from "./components/LoginPage";
import Dashboard from "./components/Dashboard";
import { useUserStore } from "./stores/userStore";
import { apiClient } from "./utils/api";

const App: React.FC = () => {
  const { isAuthenticated, setUser, setLoading, isLoading } = useUserStore();

  useEffect(() => {
    // Check if user is authenticated by looking for session
    const checkAuth = async () => {
      setLoading(true);
      try {
        const response = await apiClient.auth.status();
        const data = response.data;

        if (data.authenticated && data.user) {
          setUser({
            id: data.user.id,
            githubId: data.user.githubId,
            name: data.user.name,
            username: data.user.username,
            avatarUrl: data.user.avatarUrl,
          });
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setLoading(false);
      }
    };

    // Only run auth check once on mount
    checkAuth();
  }, []); // Remove dependencies to prevent re-runs

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p className="mt-2 text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />
          }
        />
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />}
        />
      </Routes>
    </Router>
  );
};

export default App;
