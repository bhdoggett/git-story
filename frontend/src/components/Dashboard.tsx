import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import RepositorySelector from "./RepositorySelector";
import StoriesList from "./StoriesList";
import { useUserStore } from "../stores/userStore";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"stories" | "repos">("stories");
  const { user, logout } = useUserStore();

  const handleLogout = () => {
    logout();
    const apiBaseUrl =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";
    window.location.href = `${apiBaseUrl}/auth/logout`;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">Git Story</h1>
              <span className="text-gray-400">|</span>
              <span className="text-gray-300">
                Welcome back, {user?.name || "User"}!
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-800 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("stories")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "stories"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700"
              }`}
            >
              My Stories
            </button>
            <button
              onClick={() => setActiveTab("repos")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "repos"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700"
              }`}
            >
              Connect Repositories
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          {activeTab === "stories" ? <StoriesList /> : <RepositorySelector />}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
