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

interface RepositoryStats {
  totalCommits: number;
  lastUpdated: string;
}

const StoriesList: React.FC = () => {
  const [connectedRepos, setConnectedRepos] = useState<ConnectedRepository[]>(
    []
  );
  const [stories, setStories] = useState<{ [repoId: string]: Story }>({});
  const [repoStats, setRepoStats] = useState<{
    [repoId: string]: RepositoryStats;
  }>({});
  const [loading, setLoading] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [intelligentStoryView, setIntelligentStoryView] = useState<{
    repoId: string;
    repoName: string;
  } | null>(null);

  useEffect(() => {
    fetchConnectedRepositories();
  }, []);

  const fetchConnectedRepositories = async () => {
    try {
      const response = await apiClient.repos.getConnected();
      setConnectedRepos(response.data);

      // Fetch story data for each repository
      const storyData: { [repoId: string]: Story } = {};
      const statsData: { [repoId: string]: RepositoryStats } = {};

      for (const repo of response.data) {
        try {
          // Fetch story data
          const storyResponse = await apiClient.stories.getStory(repo.id);
          storyData[repo.id] = storyResponse.data;
        } catch (error) {
          // Story doesn't exist yet, that's okay
          console.log(`No story found for repo ${repo.id}`);
        }

        try {
          // Fetch repository stats (total commits)
          const commitsResponse = await apiClient.repos.getCommits(
            repo.id,
            1,
            1,
            false
          );
          statsData[repo.id] = {
            totalCommits: commitsResponse.data.pagination.totalCommits,
            lastUpdated: new Date().toISOString(), // We could get this from the repo data if needed
          };
        } catch (error) {
          console.log(`Could not fetch stats for repo ${repo.id}:`, error);
          statsData[repo.id] = {
            totalCommits: 0,
            lastUpdated: new Date().toISOString(),
          };
        }
      }

      setStories(storyData);
      setRepoStats(statsData);
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
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mt-1">
                {stories[repo.id]?.chapters?.length > 0 ? (
                  <span>
                    {stories[repo.id].chapters.length} chapter
                    {stories[repo.id].chapters.length !== 1 ? "s" : ""}
                  </span>
                ) : (
                  <span>No chapters yet</span>
                )}
                {repoStats[repo.id]?.totalCommits > 0 && (
                  <span>
                    {repoStats[repo.id].totalCommits.toLocaleString()} total
                    commits
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleGenerateStory(repo.id, repo.name)}
                className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-green-900/50 text-green-300 hover:bg-green-800/50 border border-green-700"
              >
                Story
              </button>
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
