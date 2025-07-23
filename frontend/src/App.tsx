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

const App: React.FC = () => {
  const { isAuthenticated, setUser, setLoading } = useUserStore();

  useEffect(() => {
    // Check if user is authenticated by looking for session
    const checkAuth = async () => {
      setLoading(true);
      try {
        const response = await fetch("http://localhost:8001/auth/status", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.user) {
            setUser({
              id: data.user.id,
              githubId: data.user.githubId,
              name: data.user.name,
              username: data.user.username,
              avatarUrl: data.user.avatarUrl,
            });
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [setUser, setLoading]);

  // Show loading while checking authentication
  const { isLoading } = useUserStore();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
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
