import React, { useState } from "react";

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

interface CommitDisplayProps {
  commits: Commit[];
  showAnalysis?: boolean;
  showGitHubLink?: boolean;
  showExpandButton?: boolean;
  className?: string;
}

const CommitDisplay: React.FC<CommitDisplayProps> = ({
  commits,
  showAnalysis = false,
  showGitHubLink = true,
  showExpandButton = true,
  className = "",
}) => {
  const [expandedCommits, setExpandedCommits] = useState<Set<string>>(
    new Set()
  );

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

  const toggleExpanded = (sha: string) => {
    const newExpanded = new Set(expandedCommits);
    if (newExpanded.has(sha)) {
      newExpanded.delete(sha);
    } else {
      newExpanded.add(sha);
    }
    setExpandedCommits(newExpanded);
  };

  if (commits.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-400">No commits found</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
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
                <span className="font-mono">{commit.sha.substring(0, 7)}</span>
              </div>
            </div>
            <div className="ml-4 flex items-center space-x-2">
              {showExpandButton && (
                <button
                  onClick={() => toggleExpanded(commit.sha)}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                >
                  {expandedCommits.has(commit.sha) ? "Hide Diff" : "Show Diff"}
                </button>
              )}
              {showGitHubLink && (
                <a
                  href={commit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-300 text-sm font-medium"
                >
                  GitHub
                </a>
              )}
            </div>
          </div>

          {/* AI Analysis */}
          {showAnalysis && commit.analysis && (
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
                  <span className="text-xs text-gray-400">{file.filename}</span>
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
          {expandedCommits.has(commit.sha) && (
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
  );
};

export default CommitDisplay;
