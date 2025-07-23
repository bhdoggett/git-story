import React, { useState, useEffect } from "react";
import { apiClient } from "../utils/api";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  updated_at: string;
}

interface ConnectedRepository {
  id: string;
  name: string;
  githubRepoId: string;
  narration: string[];
}

const RepositorySelector: React.FC = () => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [connectedRepos, setConnectedRepos] = useState<ConnectedRepository[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<number | null>(null);

  useEffect(() => {
    fetchRepositories();
    fetchConnectedRepositories();
  }, []);

  const fetchRepositories = async () => {
    try {
      const response = await apiClient.repos.getGitHubRepos();
      setRepositories(response.data);
    } catch (err) {
      setError("Failed to load repositories");
      console.error("Error fetching repositories:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectedRepositories = async () => {
    try {
      const response = await apiClient.repos.getConnected();
      setConnectedRepos(response.data);
    } catch (err) {
      console.error("Error fetching connected repositories:", err);
    }
  };

  const connectRepository = async (repo: Repository) => {
    setConnecting(repo.id);
    try {
      await apiClient.repos.connect({
        githubRepoId: repo.id,
        name: repo.name,
        full_name: repo.full_name, // Add the full_name
      });

      // Refresh connected repositories
      await fetchConnectedRepositories();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to connect repository"
      );
    } finally {
      setConnecting(null);
    }
  };

  const isConnected = (repoId: number) => {
    return connectedRepos.some(
      (repo) => repo.githubRepoId === repoId.toString()
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border border-red-800 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-400">Error</h3>
            <div className="mt-2 text-sm text-red-300">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connected Repositories */}
      {connectedRepos.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-white mb-4">
            Connected Repositories
          </h3>
          <div className="grid gap-4">
            {connectedRepos.map((repo) => (
              <div
                key={repo.id}
                className="bg-green-900/20 border border-green-800 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-green-300">
                      {repo.name}
                    </h4>
                    <p className="text-sm text-green-400">Connected</p>
                  </div>
                  <div className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Repositories */}
      <div>
        <h3 className="text-lg font-medium text-white mb-4">
          Available Repositories
        </h3>
        <div className="grid gap-4">
          {repositories.map((repo) => {
            const connected = isConnected(repo.id);
            return (
              <div
                key={repo.id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-white">
                        {repo.name}
                      </h4>
                      {repo.private && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300">
                          Private
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-sm text-gray-400 mt-1">
                        {repo.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Updated {new Date(repo.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="ml-4">
                    {connected ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-700">
                        Connected
                      </span>
                    ) : (
                      <button
                        onClick={() => connectRepository(repo)}
                        disabled={connecting === repo.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300 hover:bg-blue-800/50 border border-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {connecting === repo.id ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-300"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Connecting...
                          </>
                        ) : (
                          "Connect"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RepositorySelector;
