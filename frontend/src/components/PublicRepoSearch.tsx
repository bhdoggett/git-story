import React, { useState } from "react";
import { apiClient } from "../utils/api";

interface PublicRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  updated_at: string;
  stargazers_count: number;
  language: string | null;
  forks_count: number;
  owner: {
    login: string;
    avatar_url: string;
  };
}

interface ConnectedRepository {
  id: string;
  name: string;
  githubRepoId: string;
}

interface PublicRepoSearchProps {
  connectedRepos: ConnectedRepository[];
  onRepositoryConnected: () => void;
}

const PublicRepoSearch: React.FC<PublicRepoSearchProps> = ({
  connectedRepos,
  onRepositoryConnected,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PublicRepository[]>([]);
  const [searching, setSearching] = useState(false);
  const [connecting, setConnecting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const searchRepositories = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError(null);
    try {
      const response = await apiClient.repos.searchPublicRepos(
        searchQuery.trim()
      );
      setSearchResults(response.data.items);
      setHasSearched(true);
    } catch (err) {
      setError("Failed to search repositories");
      console.error("Error searching repositories:", err);
    } finally {
      setSearching(false);
    }
  };

  const connectRepository = async (repo: PublicRepository) => {
    setConnecting(repo.id);
    try {
      await apiClient.repos.connect({
        githubRepoId: repo.id,
        name: repo.name,
        full_name: repo.full_name,
      });

      // Refresh connected repositories
      onRepositoryConnected();
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchRepositories();
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-4">
          Search Public GitHub Repositories
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Search for any public repository on GitHub and add it to your stories
          list.
        </p>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search repositories (e.g., 'react', 'vue', 'typescript')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 text-white rounded-md px-3 py-2 pl-10 text-sm focus:outline-none focus:border-blue-500"
              />
              <svg
                className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {searching ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline"></div>
                  Searching...
                </>
              ) : (
                "Search"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error Display */}
      {error && (
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
      )}

      {/* Search Results */}
      {hasSearched && (
        <div>
          <h4 className="text-md font-medium text-white mb-4">
            Search Results
          </h4>

          {searchResults.length === 0 ? (
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-white">
                No repositories found
              </h3>
              <p className="mt-1 text-sm text-gray-400">
                Try adjusting your search terms or search for something else.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {searchResults.map((repo) => {
                const connected = isConnected(repo.id);
                return (
                  <div
                    key={repo.id}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <img
                            src={repo.owner.avatar_url}
                            alt={repo.owner.login}
                            className="w-6 h-6 rounded-full"
                          />
                          <h5 className="text-sm font-medium text-white">
                            {repo.full_name}
                          </h5>
                        </div>

                        {repo.description && (
                          <p className="text-sm text-gray-400 mb-2">
                            {repo.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                          {repo.language && (
                            <span className="flex items-center gap-1">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                              {repo.language}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {repo.stargazers_count.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {repo.forks_count.toLocaleString()}
                          </span>
                          <span>
                            Updated{" "}
                            {new Date(repo.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <a
                          href={repo.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600"
                        >
                          <svg
                            className="w-3 h-3 mr-1"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                          </svg>
                          View
                        </a>

                        {connected ? (
                          <span className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-green-900/50 text-green-300 border border-green-700">
                            <svg
                              className="w-3 h-3 mr-1"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-7.5 7.5a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L8.5 12.086l6.793-6.793a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Connected
                          </span>
                        ) : (
                          <button
                            onClick={() => connectRepository(repo)}
                            disabled={connecting === repo.id}
                            className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-700"
                          >
                            {connecting === repo.id ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                Adding...
                              </>
                            ) : (
                              <>
                                <svg
                                  className="w-3 h-3 mr-1"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                Add to Stories
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PublicRepoSearch;
