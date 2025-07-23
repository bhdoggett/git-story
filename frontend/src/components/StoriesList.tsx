import React, { useState, useEffect } from "react";

interface ConnectedRepository {
  id: string;
  name: string;
  githubRepoId: string;
  narration: string[];
}

const StoriesList: React.FC = () => {
  const [connectedRepos, setConnectedRepos] = useState<ConnectedRepository[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConnectedRepositories();
  }, []);

  const fetchConnectedRepositories = async () => {
    try {
      const response = await fetch(
        "http://localhost:8001/api/repos/connected",
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setConnectedRepos(data);
      }
    } catch (err) {
      console.error("Error fetching connected repositories:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (connectedRepos.length === 0) {
    return (
      <div className="text-center py-8">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
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
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No stories yet
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by connecting a repository
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {connectedRepos.map((repo) => (
        <div
          key={repo.id}
          className="bg-white border border-gray-200 rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-lg font-medium text-gray-900">{repo.name}</h4>
              <p className="text-sm text-gray-500 mt-1">
                {repo.narration.length > 0
                  ? `${repo.narration.length} chapter${repo.narration.length !== 1 ? "s" : ""}`
                  : "No chapters yet"}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  // TODO: Implement story generation
                  alert("Story generation feature coming soon!");
                }}
                className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200"
              >
                Generate Story
              </button>
              <button
                onClick={() => {
                  // TODO: Implement story viewing
                  alert("Story viewing feature coming soon!");
                }}
                className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200"
              >
                View Story
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StoriesList;
