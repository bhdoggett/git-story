import React, { useState, useEffect } from "react";
import CommitHistory from "./CommitHistory";
import IntelligentStory from "./IntelligentStory";
import { apiClient } from "../utils/api";

interface ConnectedRepository {
  id: string;
  name: string;
  githubRepoId: string;
}

interface Story {
  id: string;
  repoId: string;
  chapters: Array<{
    id: string;
    title: string;
  }>;
}

const StoriesList: React.FC = () => {
  const [connectedRepos, setConnectedRepos] = useState<ConnectedRepository[]>(
    []
  );
  const [stories, setStories] = useState<{ [repoId: string]: Story }>({});
  const [loading, setLoading] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [intelligentStoryView, setIntelligentStoryView] = useState<{
    repoId: string;
    repoName: string;
  } | null>(null);
  const [updateStatus, setUpdateStatus] = useState<{
    [repoId: string]: {
      hasNewCommits: boolean;
      newCommitCount?: number;
      decision?: "append" | "new" | null;
      annotation?: string;
      proposedTitle?: string | null;
    };
  }>({});

  useEffect(() => {
    fetchConnectedRepositories();
  }, []);

  const fetchConnectedRepositories = async () => {
    try {
      const response = await apiClient.repos.getConnected();
      setConnectedRepos(response.data);

      // Fetch story data for each repository
      const storyData: { [repoId: string]: Story } = {};
      for (const repo of response.data) {
        try {
          const storyResponse = await apiClient.stories.getStory(repo.id);
          storyData[repo.id] = storyResponse.data;
        } catch (error) {
          // Story doesn't exist yet, that's okay
          console.log(`No story found for repo ${repo.id}`);
        }
      }
      setStories(storyData);

      // Check updates for each repository in parallel
      const checks = await Promise.all(
        response.data.map(async (repo: ConnectedRepository) => {
          try {
            const res = await apiClient.stories.checkStoryUpdates(repo.id);
            return [repo.id, res.data] as const;
          } catch (e) {
            console.warn("Update check failed for repo", repo.id, e);
            return [repo.id, null] as const;
          }
        })
      );

      const status: any = {};
      for (const [repoId, data] of checks) {
        if (data) status[repoId] = data;
      }
      setUpdateStatus(status);
    } catch (err) {
      console.error("Error fetching connected repositories:", err);
    } finally {
      setLoading(false);
    }
  };

  const disconnectRepository = async (repoId: string) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      "This action will delete all story data for this repo. Are you sure?"
    );

    if (!confirmed) {
      return;
    }

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

  const handleGenerateStory = async (repoId: string, repoName: string) => {
    setIntelligentStoryView({ repoId, repoName });
  };

  const handleAnalyzeUpdates = async (repoId: string) => {
    try {
      const res = await apiClient.stories.analyzeStoryUpdates(repoId);
      const data = res.data;
      if (!data.hasNewCommits) {
        alert("No new commits to analyze.");
        return;
      }
      const summary = data.decision === "append"
        ? `AI suggests appending ${data.newCommitCount} commit(s) to the last chapter.`
        : `AI suggests creating a new chapter with ${data.newCommitCount} commit(s).${data.proposedTitle ? `\nProposed title: ${data.proposedTitle}` : ""}`;
      alert(`${summary}\n\nReasoning: ${data.reasoning || "N/A"}`);
    } catch (e) {
      console.error("Failed to analyze updates", e);
      alert("Failed to analyze updates. Please try again.");
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

  // If we're in intelligent story view, show that component
  if (intelligentStoryView) {
    return (
      <div>
        <button
          onClick={() => setIntelligentStoryView(null)}
          className="mb-4 inline-flex items-center px-3 py-2 rounded-md text-sm font-medium bg-gray-700 text-white hover:bg-gray-600"
        >
          ← Back to Stories List
        </button>
        <IntelligentStory
          repoId={intelligentStoryView.repoId}
          repoName={intelligentStoryView.repoName}
        />
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
            <div className="flex-1">
              <h4 className="text-lg font-medium text-white">{repo.name}</h4>
              <p className="text-sm text-gray-400 mt-1">
                {stories[repo.id]?.chapters?.length > 0
                  ? `${stories[repo.id].chapters.length} chapter${stories[repo.id].chapters.length !== 1 ? "s" : ""}`
                  : "No chapters yet"}
              </p>
              {updateStatus[repo.id] && (
                <div className="mt-2 text-sm">
                  {updateStatus[repo.id].hasNewCommits ? (
                    <span className="inline-flex items-center gap-2 px-2 py-1 rounded bg-yellow-900/40 text-yellow-300 border border-yellow-700">
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a1 1 0 01.894.553l7 14A1 1 0 0117 18H3a1 1 0 01-.894-1.447l7-14A1 1 0 0110 2z"/></svg>
                      {updateStatus[repo.id].annotation || `There are updates available.`}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-2 py-1 rounded bg-green-900/40 text-green-300 border border-green-700">
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.5 7.5a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L8.5 12.086l6.793-6.793a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      Up to date
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleGenerateStory(repo.id, repo.name)}
                className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-green-900/50 text-green-300 hover:bg-green-800/50 border border-green-700"
              >
                Story
              </button>
              {updateStatus[repo.id]?.hasNewCommits && (
                <button
                  onClick={() => handleAnalyzeUpdates(repo.id)}
                  className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-yellow-900/50 text-yellow-300 hover:bg-yellow-800/50 border border-yellow-700"
                >
                  Update Story
                </button>
              )}
              <button
                onClick={() =>
                  setSelectedRepo(selectedRepo === repo.id ? null : repo.id)
                }
                className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-blue-900/50 text-blue-300 hover:bg-blue-800/50 border border-blue-700"
              >
                {selectedRepo === repo.id ? "Hide Commits" : "View Commits"}
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
