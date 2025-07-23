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
    window.location.href = "http://localhost:8001/auth/logout";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Git Story</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Welcome back, {user?.name || "User"}!
              </span>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("stories")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "stories"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                My Stories
              </button>
              <button
                onClick={() => setActiveTab("repos")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "repos"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Connect Repositories
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === "stories" && (
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-8 w-8 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      My Stories
                    </h3>
                    <p className="text-sm text-gray-500">
                      View and manage your Git stories
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  <StoriesList />
                </div>
              </div>
            </div>
          )}

          {activeTab === "repos" && (
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <RepositorySelector />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
