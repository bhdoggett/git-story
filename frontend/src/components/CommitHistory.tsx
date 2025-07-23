import React, { useState, useEffect } from "react";
import { apiClient } from "../utils/api";

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
}

interface CommitHistoryProps {
  repoId: string;
  repoName: string;
}

const CommitHistory: React.FC<CommitHistoryProps> = ({ repoId, repoName }) => {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null);

  useEffect(() => {
    fetchCommits();
  }, [repoId]);

  const fetchCommits = async () => {
    try {
      setLoading(true);
      const response = await apiClient.repos.getCommits(repoId);
      setCommits(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch commits");
    } finally {
      setLoading(false);
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">
          Commit History - {repoName}
        </h3>
        <span className="text-sm text-gray-400">{commits.length} commits</span>
      </div>

      <div className="space-y-4">
        {commits.map((commit) => (
          <div
            key={commit.sha}
            className="bg-gray-800 border border-gray-700 rounded-lg p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-white mb-1">
                  {commit.message.split("\n")[0]}
                </h4>
                <div className="flex items-center space-x-4 text-xs text-gray-400">
                  <span>{commit.author}</span>
                  <span>{new Date(commit.date).toLocaleDateString()}</span>
                  <span className="font-mono">
                    {commit.sha.substring(0, 7)}
                  </span>
                </div>
              </div>
              <div className="ml-4 flex items-center space-x-2">
                <button
                  onClick={() =>
                    setExpandedCommit(
                      expandedCommit === commit.sha ? null : commit.sha
                    )
                  }
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
              </div>
            )}
          </div>
        ))}
      </div>

      {commits.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No commits found</p>
        </div>
      )}
    </div>
  );
};

export default CommitHistory;
