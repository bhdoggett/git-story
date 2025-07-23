import React, { useState, useEffect } from "react";

type Repository = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  updated_at: string;
};

type ConnectedRepository = {
  id: string;
  name: string;
  githubRepoId: string;
  narration: string[];
};

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
      const response = await fetch("http://localhost:8001/api/repos/github", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch repositories");
      }

      const data = await response.json();
      setRepositories(data);
    } catch (err) {
      setError("Failed to load repositories");
      console.error("Error fetching repositories:", err);
    } finally {
      setLoading(false);
    }
  };

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
    }
  };

  const connectRepository = async (repo: Repository) => {
    setConnecting(repo.id);
    try {
      const response = await fetch("http://localhost:8001/api/repos/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          githubRepoId: repo.id,
          name: repo.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to connect repository");
      }

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
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
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
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
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Connected Repositories
          </h3>
          <div className="grid gap-4">
            {connectedRepos.map((repo) => (
              <div
                key={repo.id}
                className="bg-green-50 border border-green-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-green-900">
                      {repo.name}
                    </h4>
                    <p className="text-sm text-green-700">Connected</p>
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
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Available Repositories
        </h3>
        <div className="grid gap-4">
          {repositories.map((repo) => {
            const connected = isConnected(repo.id);
            return (
              <div
                key={repo.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {repo.name}
                      </h4>
                      {repo.private && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          Private
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {repo.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Updated {new Date(repo.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="ml-4">
                    {connected ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Connected
                      </span>
                    ) : (
                      <button
                        onClick={() => connectRepository(repo)}
                        disabled={connecting === repo.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {connecting === repo.id ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-800"
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
