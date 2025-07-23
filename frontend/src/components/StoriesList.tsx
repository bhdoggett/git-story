import React, { useState, useEffect } from "react";
import CommitHistory from "./CommitHistory";
import { apiClient } from "../utils/api";

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
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    fetchConnectedRepositories();
  }, []);

  const fetchConnectedRepositories = async () => {
    try {
      const response = await apiClient.repos.getConnected();
      setConnectedRepos(response.data);
    } catch (err) {
      console.error("Error fetching connected repositories:", err);
    } finally {
      setLoading(false);
    }
  };

  const disconnectRepository = async (repoId: string) => {
    setDisconnecting(repoId);
    try {
      await apiClient.repos.disconnect(repoId);
      // Refresh the list
      await fetchConnectedRepositories();
    } catch (err) {
      console.error("Error disconnecting repository:", err);
    } finally {
      setDisconnecting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (connectedRepos.length === 0) {
    return (
      <div className="text-center py-8">
        <svg
          className="mx-auto h-12 w-12 text-gray-500"
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
        <h3 className="mt-2 text-sm font-medium text-white">No stories yet</h3>
        <p className="mt-1 text-sm text-gray-400">
          Get started by connecting a repository
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {connectedRepos.map((repo) => (
        <div
          key={repo.id}
          className="bg-gray-800 border border-gray-700 rounded-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h4 className="text-lg font-medium text-white">{repo.name}</h4>
              <p className="text-sm text-gray-400 mt-1">
                {repo.narration.length > 0
                  ? `${repo.narration.length} chapter${repo.narration.length !== 1 ? "s" : ""}`
                  : "No chapters yet"}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() =>
                  setSelectedRepo(selectedRepo === repo.id ? null : repo.id)
                }
                className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-blue-900/50 text-blue-300 hover:bg-blue-800/50 border border-blue-700"
              >
                {selectedRepo === repo.id ? "Hide Commits" : "View Commits"}
              </button>
              <button
                onClick={() => {
                  // TODO: Implement story generation
                  alert("Story generation feature coming soon!");
                }}
                className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-green-900/50 text-green-300 hover:bg-green-800/50 border border-green-700"
              >
                Generate Story
              </button>
              <button
                onClick={() => disconnectRepository(repo.id)}
                disabled={disconnecting === repo.id}
                className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-red-900/50 text-red-300 hover:bg-red-800/50 border border-red-700 disabled:opacity-50"
              >
                {disconnecting === repo.id ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          </div>

          {/* Commit History */}
          {selectedRepo === repo.id && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <CommitHistory repoId={repo.id} repoName={repo.name} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default StoriesList;
