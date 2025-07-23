import React, { useState, useEffect } from "react";
import { apiClient } from "../utils/api";

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

interface CommitHistoryProps {
  repoId: string;
  repoName: string;
}

const CommitHistory: React.FC<CommitHistoryProps> = ({ repoId, repoName }) => {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Commit History - {repoName}
        </h3>
        <span className="text-sm text-gray-500">{commits.length} commits</span>
      </div>

      <div className="space-y-3">
        {commits.map((commit) => (
          <div
            key={commit.sha}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  {commit.message.split("\n")[0]}
                </h4>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>{commit.author}</span>
                  <span>{new Date(commit.date).toLocaleDateString()}</span>
                  <span className="font-mono">
                    {commit.sha.substring(0, 7)}
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <a
                  href={commit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {commits.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No commits found</p>
        </div>
      )}
    </div>
  );
};

export default CommitHistory;
