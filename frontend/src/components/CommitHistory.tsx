import React, { useState, useEffect } from "react";
import { apiClient } from "../utils/api";
import { storyCache } from "../utils/indexedDB";

interface DiffFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
  diff: DiffFile[];
  analysis?: string;
}

interface PaginationInfo {
  page: number;
  perPage: number;
  totalCommits: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface CommitHistoryProps {
  repoId: string;
  repoName: string;
}

const CommitHistory: React.FC<CommitHistoryProps> = ({ repoId, repoName }) => {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null);
  const [analyzingCommit, setAnalyzingCommit] = useState<string | null>(null);
  const [analyzingBatch, setAnalyzingBatch] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingDiffs, setLoadingDiffs] = useState<{ [sha: string]: boolean }>(
    {}
  );

  useEffect(() => {
    fetchCommits();
  }, [repoId]);

  const fetchCommits = async (page = 1, append = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // Try to get from cache first (only for first page)
      if (page === 1) {
        const cachedCommits = await storyCache.getRepositoryCommits(repoId);
        if (cachedCommits) {
          setCommits(cachedCommits.commits);
          setPagination({
            page: 1,
            perPage: 50,
            totalCommits: cachedCommits.commits.length,
            hasNextPage: cachedCommits.commits.length === 50,
            hasPrevPage: false,
          });
          setLoading(false);
          return;
        }
      }

      // If not in cache, fetch from API
      const response = await apiClient.repos.getCommits(
        repoId,
        page,
        50,
        false
      );
      const newCommits = response.data.commits;

      if (append) {
        setCommits((prev) => [...prev, ...newCommits]);
      } else {
        setCommits(newCommits);
        // Cache the first page
        await storyCache.setRepositoryCommits(repoId, newCommits);
      }

      setPagination(response.data.pagination);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch commits");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreCommits = async () => {
    if (pagination?.hasNextPage) {
      await fetchCommits(currentPage + 1, true);
    }
  };

  const loadCommitDiff = async (commitSha: string) => {
    // Check if diff is already loaded
    const commit = commits.find((c) => c.sha === commitSha);
    if (commit && commit.diff.length > 0) {
      return; // Diff already loaded
    }

    setLoadingDiffs((prev) => ({ ...prev, [commitSha]: true }));

    try {
      // Check cache first
      const cachedDiff = await storyCache.getCommitDiff(repoId, commitSha);
      if (cachedDiff && cachedDiff.diff.length > 0) {
        // Update the commit with cached diff
        setCommits((prev) =>
          prev.map((c) =>
            c.sha === commitSha
              ? { ...c, diff: cachedDiff.diff, analysis: cachedDiff.analysis }
              : c
          )
        );
        return;
      }

      // Fetch from API
      const response = await apiClient.repos.getCommitDiff(repoId, commitSha);
      const commitWithDiff = response.data;

      // Update the commit with diff
      setCommits((prev) =>
        prev.map((c) =>
          c.sha === commitSha ? { ...c, diff: commitWithDiff.diff } : c
        )
      );

      // Cache the diff
      await storyCache.updateCommitDiff(repoId, commitSha, commitWithDiff.diff);
    } catch (err) {
      console.error("Failed to load commit diff:", err);
      setError("Failed to load commit diff");
    } finally {
      setLoadingDiffs((prev) => ({ ...prev, [commitSha]: false }));
    }
  };

  const analyzeCommit = async (commitSha: string) => {
    try {
      setAnalyzingCommit(commitSha);
      const response = await apiClient.repos.analyzeCommit(repoId, commitSha);

      // Update the specific commit with the analysis
      setCommits((prevCommits) =>
        prevCommits.map((commit) =>
          commit.sha === commitSha
            ? { ...commit, analysis: response.data.analysis }
            : commit
        )
      );

      // Cache the analysis
      const commit = commits.find((c) => c.sha === commitSha);
      if (commit) {
        await storyCache.updateCommitDiff(
          repoId,
          commitSha,
          commit.diff,
          response.data.analysis
        );
      }
    } catch (err: any) {
      console.error("Failed to analyze commit:", err);
      const errorMessage =
        err.response?.data?.error || "Failed to analyze commit";
      setError(errorMessage);
      setTimeout(() => setError(null), 5000); // Clear error after 5 seconds
    } finally {
      setAnalyzingCommit(null);
    }
  };

  const analyzeAllCommits = async () => {
    try {
      setAnalyzingBatch(true);
      const commitShas = commits.map((commit) => commit.sha);
      const response = await apiClient.repos.analyzeCommitsBatch(
        repoId,
        commitShas
      );

      // Update all commits with their analyses
      setCommits((prevCommits) =>
        prevCommits.map((commit) => ({
          ...commit,
          analysis: response.data.analyses[commit.sha] || commit.analysis,
        }))
      );

      // Cache all analyses
      for (const commit of commits) {
        const analysis = response.data.analyses[commit.sha];
        if (analysis) {
          await storyCache.updateCommitDiff(
            repoId,
            commit.sha,
            commit.diff,
            analysis
          );
        }
      }
    } catch (err: any) {
      console.error("Failed to analyze commits:", err);
      const errorMessage =
        err.response?.data?.error || "Failed to analyze commits";
      setError(errorMessage);
      setTimeout(() => setError(null), 5000); // Clear error after 5 seconds
    } finally {
      setAnalyzingBatch(false);
    }
  };

  const formatPatch = (patch: string) => {
    if (!patch) return null;

    return patch.split("\n").map((line, index) => {
      let className = "font-mono text-sm";
      if (line.startsWith("+")) {
        className += " text-green-400 bg-green-900/20";
      } else if (line.startsWith("-")) {
        className += " text-red-400 bg-red-900/20";
      } else if (line.startsWith("@")) {
        className += " text-blue-400 bg-blue-900/20 font-semibold";
      } else {
        className += " text-gray-300";
      }

      return (
        <div key={index} className={className}>
          {line}
        </div>
      );
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "added":
        return "bg-green-900/50 text-green-300 border-green-700";
      case "modified":
        return "bg-yellow-900/50 text-yellow-300 border-yellow-700";
      case "removed":
        return "bg-red-900/50 text-red-300 border-red-700";
      case "renamed":
        return "bg-blue-900/50 text-blue-300 border-blue-700";
      default:
        return "bg-gray-700 text-gray-300 border-gray-600";
    }
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-white">
            Commit History - {repoName}
          </h3>
          {pagination && (
            <p className="text-sm text-gray-400 mt-1">
              Showing {commits.length} of{" "}
              {pagination.totalCommits.toLocaleString()} commits
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={analyzeAllCommits}
            disabled={analyzingBatch || commits.length === 0}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors duration-200 flex items-center gap-2"
          >
            {analyzingBatch ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <span>Analyze All with AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {commits.map((commit) => (
          <div
            key={commit.sha}
            className="bg-gray-800 border border-gray-700 rounded-lg p-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-3">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-white mb-1">
                  {commit.message.split("\n")[0]}
                </h4>
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                  <span>{commit.author}</span>
                  <span>{new Date(commit.date).toLocaleDateString()}</span>
                  <span className="font-mono">
                    {commit.sha.substring(0, 7)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => analyzeCommit(commit.sha)}
                  disabled={analyzingCommit === commit.sha || !!commit.analysis}
                  className="text-purple-400 hover:text-purple-300 disabled:text-purple-600 disabled:cursor-not-allowed text-sm font-medium flex items-center space-x-1"
                >
                  {analyzingCommit === commit.sha ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-400"></div>
                      <span>Analyzing...</span>
                    </>
                  ) : commit.analysis ? (
                    <>
                      <svg
                        className="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Analyzed</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                      <span>Analyze</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (expandedCommit === commit.sha) {
                      setExpandedCommit(null);
                    } else {
                      setExpandedCommit(commit.sha);
                      // Load diff if not already loaded
                      if (commit.diff.length === 0) {
                        loadCommitDiff(commit.sha);
                      }
                    }
                  }}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                >
                  {expandedCommit === commit.sha ? "Hide Diff" : "Show Diff"}
                </button>
                <a
                  href={commit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-300 text-sm font-medium"
                >
                  GitHub
                </a>
              </div>
            </div>

            {/* AI Analysis */}
            {commit.analysis && (
              <div className="mb-4 p-4 bg-purple-900/20 border border-purple-700 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <svg
                    className="w-4 h-4 text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-purple-300">
                    AI Analysis
                  </span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {commit.analysis}
                </p>
              </div>
            )}

            {/* File changes summary */}
            <div className="mb-3">
              <div className="flex flex-wrap gap-2">
                {commit.diff.map((file, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(file.status)}`}
                    >
                      {file.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {file.filename}
                    </span>
                    {file.additions > 0 && (
                      <span className="text-xs text-green-400">
                        +{file.additions}
                      </span>
                    )}
                    {file.deletions > 0 && (
                      <span className="text-xs text-red-400">
                        -{file.deletions}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Expanded diff view */}
            {expandedCommit === commit.sha && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                {loadingDiffs[commit.sha] ? (
                  <div className="flex justify-center items-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    <span className="ml-2 text-sm text-gray-400">
                      Loading diff...
                    </span>
                  </div>
                ) : commit.diff.length > 0 ? (
                  <div className="space-y-4">
                    {commit.diff.map((file, index) => (
                      <div key={index} className="bg-gray-900 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-white">
                            {file.filename}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(file.status)}`}
                          >
                            {file.status}
                          </span>
                        </div>
                        {file.patch && (
                          <div className="bg-black border border-gray-700 rounded p-2 overflow-x-auto">
                            {formatPatch(file.patch)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-400">
                    No diff available for this commit
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {pagination?.hasNextPage && (
        <div className="flex justify-center pt-4">
          <button
            onClick={loadMoreCommits}
            disabled={loadingMore}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors duration-200 flex items-center gap-2"
          >
            {loadingMore ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Loading...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
                <span>Load More Commits</span>
              </>
            )}
          </button>
        </div>
      )}

      {commits.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No commits found</p>
        </div>
      )}
    </div>
  );
};

export default CommitHistory;
