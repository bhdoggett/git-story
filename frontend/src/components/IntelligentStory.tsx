import React, { useState, useEffect } from "react";
import { apiClient } from "../utils/api";
import CommitDisplay from "./CommitDisplay";
import { storyCache, calculateDateRange } from "../utils/indexedDB";

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

interface Chapter {
  id: string;
  title: string;
  summary: string;
  userNotes?: string;
  commitShas: string[];
  commitCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Story {
  id: string;
  repoId: string;
  createdAt: string;
  chapters: Chapter[];
  repoName?: string;
  lastUpdated?: number;
  expiresAt?: number;
}

interface IntelligentStoryProps {
  repoId: string;
  repoName: string;
}

const IntelligentStory: React.FC<IntelligentStoryProps> = ({
  repoId,
  repoName,
}) => {
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [chapterNotes, setChapterNotes] = useState<{
    [chapterId: string]: string;
  }>({});
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editingSummary, setEditingSummary] = useState<string | null>(null);
  const [chapterCommits, setChapterCommits] = useState<{
    [chapterId: string]: Commit[];
  }>({});
  const [loadingCommits, setLoadingCommits] = useState<{
    [chapterId: string]: boolean;
  }>({});
  const [globalContext, setGlobalContext] = useState<string>(() => {
    // Initialize from localStorage if available
    const saved = localStorage.getItem(`globalContext_${repoId}`);
    return saved || "";
  });
  const [editingGlobalContext, setEditingGlobalContext] =
    useState<boolean>(false);
  const [savingContext, setSavingContext] = useState<boolean>(false);

  useEffect(() => {
    fetchStory();
  }, [repoId]);

  const fetchStory = async () => {
    setLoading(true);
    try {
      // Try to get from cache first
      const cachedStory = await storyCache.getStory(repoId);

      if (cachedStory) {
        setStory(cachedStory);

        // Initialize notes state
        const notes: { [chapterId: string]: string } = {};
        cachedStory.chapters.forEach((chapter: Chapter) => {
          notes[chapter.id] = chapter.userNotes || "";
        });
        setChapterNotes(notes);

        // Load cached commit data
        for (const chapter of cachedStory.chapters) {
          const cachedCommits = await storyCache.getChapterCommits(chapter.id);
          if (cachedCommits) {
            setChapterCommits((prev) => ({
              ...prev,
              [chapter.id]: cachedCommits.commits,
            }));
          }
        }

        setLoading(false);
        return;
      }

      // If not in cache, fetch from API
      const response = await apiClient.stories.getStory(repoId);
      setStory(response.data);

      // Initialize notes state
      const notes: { [chapterId: string]: string } = {};
      response.data.chapters.forEach((chapter: Chapter) => {
        notes[chapter.id] = chapter.userNotes || "";
      });
      setChapterNotes(notes);

      // Fetch commit data for all chapters to display date ranges
      for (const chapter of response.data.chapters) {
        try {
          const commitResponse = await apiClient.stories.getChapterCommits(
            chapter.id
          );
          const commits = commitResponse.data.commits;

          setChapterCommits((prev) => ({
            ...prev,
            [chapter.id]: commits,
          }));

          // Cache the commit data
          await storyCache.setChapterCommits(chapter.id, commits);
        } catch (error) {
          console.error(
            `Error fetching commits for chapter ${chapter.id}:`,
            error
          );
        }
      }

      // Cache the story data
      await storyCache.setStory({
        ...response.data,
        repoName,
        lastUpdated: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      });

      // Fetch global context
      await fetchGlobalContext();
    } catch (error) {
      console.error("Error fetching story:", error);
      // Story doesn't exist yet, that's okay
    } finally {
      setLoading(false);
    }
  };

  const generateChapters = async () => {
    setGenerating(true);
    try {
      // Pass global context to the API
      const response = await apiClient.stories.generateChapters(
        repoId,
        globalContext
      );
      setStory(response.data);

      // Cache the story data
      try {
        await storyCache.setStory({
          ...response.data,
          repoName,
          lastUpdated: Date.now(),
          expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        });
      } catch (cacheError) {
        console.error("Error caching story data:", cacheError);
        // Don't fail the whole operation for cache errors
      }

      // Initialize notes state
      const notes: { [chapterId: string]: string } = {};
      response.data.chapters.forEach((chapter: Chapter) => {
        notes[chapter.id] = chapter.userNotes || "";
      });
      setChapterNotes(notes);

      // Fetch commit data for all chapters to display date ranges
      for (const chapter of response.data.chapters) {
        try {
          const commitResponse = await apiClient.stories.getChapterCommits(
            chapter.id
          );
          const commits = commitResponse.data.commits;
          setChapterCommits((prev) => ({
            ...prev,
            [chapter.id]: commits,
          }));

          // Cache the commit data
          try {
            await storyCache.setChapterCommits(chapter.id, commits);
          } catch (cacheError) {
            console.error(
              `Error caching commits for chapter ${chapter.id}:`,
              cacheError
            );
            // Don't fail the whole operation for cache errors
          }
        } catch (error) {
          console.error(
            `Error fetching commits for chapter ${chapter.id}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("Error generating chapters:", error);
      alert("Failed to generate chapters. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const updateChapterNotes = async (chapterId: string, notes: string) => {
    try {
      await apiClient.stories.updateChapterNotes(chapterId, notes);
      setChapterNotes((prev) => ({ ...prev, [chapterId]: notes }));
    } catch (error) {
      console.error("Error updating chapter notes:", error);
      alert("Failed to save notes. Please try again.");
    }
  };

  const updateChapterTitle = async (chapterId: string, title: string) => {
    try {
      await apiClient.stories.updateChapterTitle(chapterId, title);
      setStory((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          chapters: prev.chapters.map((chapter) =>
            chapter.id === chapterId ? { ...chapter, title } : chapter
          ),
        };
      });
      setEditingTitle(null);
    } catch (error) {
      console.error("Error updating chapter title:", error);
      alert("Failed to save title. Please try again.");
    }
  };

  const updateChapterSummary = async (chapterId: string, summary: string) => {
    try {
      await apiClient.stories.updateChapterSummary(chapterId, summary);
      setStory((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          chapters: prev.chapters.map((chapter) =>
            chapter.id === chapterId ? { ...chapter, summary } : chapter
          ),
        };
      });
      setEditingSummary(null);
    } catch (error) {
      console.error("Error updating chapter summary:", error);
      alert("Failed to save summary. Please try again.");
    }
  };

  const regenerateChapterSummary = async (chapterId: string) => {
    setRegenerating(chapterId);
    try {
      const response =
        await apiClient.stories.regenerateChapterSummary(chapterId);

      // Update the story with the new summary
      setStory((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          chapters: prev.chapters.map((chapter) =>
            chapter.id === chapterId
              ? { ...chapter, summary: response.data.summary }
              : chapter
          ),
        };
      });
    } catch (error) {
      console.error("Error regenerating summary:", error);
      alert("Failed to regenerate summary. Please try again.");
    } finally {
      setRegenerating(null);
    }
  };

  const fetchGlobalContext = async () => {
    try {
      const response = await apiClient.stories.getGlobalContext(repoId);
      const context = response.data.globalContext;
      setGlobalContext(context);
      // Update localStorage with the fetched context
      localStorage.setItem(`globalContext_${repoId}`, context);
    } catch (error) {
      console.error("Error fetching global context:", error);
      // Story might not exist yet, that's okay
    }
  };

  const updateGlobalContext = async (context: string) => {
    setSavingContext(true);
    try {
      // If story exists, save to database immediately
      if (story) {
        await apiClient.stories.updateGlobalContext(repoId, context);
      }
      // Always update local state and localStorage
      setGlobalContext(context);
      localStorage.setItem(`globalContext_${repoId}`, context);
      setEditingGlobalContext(false);
    } catch (error) {
      console.error("Error updating global context:", error);
      alert("Failed to save context. Please try again.");
    } finally {
      setSavingContext(false);
    }
  };

  const exportStory = () => {
    if (!story || story.chapters.length === 0) return;

    // Create the story content
    let content = `STORY: ${repoName}\n`;
    content += `Generated on: ${new Date().toLocaleDateString()}\n`;
    content += `\n${"=".repeat(50)}\n\n`;

    // Add global context if available
    if (globalContext) {
      content += `PROJECT CONTEXT:\n${globalContext}\n\n${"=".repeat(50)}\n\n`;
    }

    // Add chapters
    story.chapters.forEach((chapter, index) => {
      content += `CHAPTER ${index + 1}: ${chapter.title || `Chapter ${index + 1}`}\n`;
      content += `${"-".repeat(40)}\n\n`;

      // Add chapter summary
      content += `SUMMARY:\n${chapter.summary}\n\n`;

      // Add user notes if available
      if (chapterNotes[chapter.id]) {
        content += `USER NOTES:\n${chapterNotes[chapter.id]}\n\n`;
      }

      // Add commit information
      content += `COMMITS: ${chapter.commitCount} commit${chapter.commitCount !== 1 ? "s" : ""}\n`;

      // Add date range if available
      const commits = chapterCommits[chapter.id];
      if (commits && commits.length > 0) {
        content += `DATE RANGE: ${calculateDateRange(commits)}\n`;
      }

      content += `\n${"=".repeat(50)}\n\n`;
    });

    // Create and download the file
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${repoName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_story.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fetchChapterCommits = async (chapterId: string) => {
    if (chapterCommits[chapterId]) return; // Already loaded

    setLoadingCommits((prev) => ({ ...prev, [chapterId]: true }));
    try {
      // Try to get from cache first
      const cachedCommits = await storyCache.getChapterCommits(chapterId);
      if (cachedCommits) {
        setChapterCommits((prev) => ({
          ...prev,
          [chapterId]: cachedCommits.commits,
        }));
        setLoadingCommits((prev) => ({ ...prev, [chapterId]: false }));
        return;
      }

      // If not in cache, fetch from API
      const response = await apiClient.stories.getChapterCommits(chapterId);
      const commits = response.data.commits;

      setChapterCommits((prev) => ({
        ...prev,
        [chapterId]: commits,
      }));

      // Cache the commit data
      await storyCache.setChapterCommits(chapterId, commits);
    } catch (error) {
      console.error("Error fetching chapter commits:", error);
    } finally {
      setLoadingCommits((prev) => ({ ...prev, [chapterId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-white">
            Story for {repoName}
          </h3>
          <p className="text-gray-400 text-sm">
            AI-powered chapter generation based on commit themes
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={generateChapters}
            disabled={generating}
            className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating Chapters...
              </>
            ) : (
              "Generate Chapters"
            )}
          </button>

          {story && story.chapters.length > 0 && (
            <button
              onClick={exportStory}
              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export Story
            </button>
          )}
        </div>
      </div>

      {/* Global Context Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h4 className="text-lg font-medium text-white mb-4">
          What should we know about your project?
        </h4>
        <p className="text-gray-400 text-sm mb-4">
          Help us understand your project better by providing context about key
          moments, important tools, dependencies, or development milestones.
          This will help the AI generate more relevant and personalized stories.
        </p>

        {editingGlobalContext ? (
          <div className="space-y-3">
            <textarea
              value={globalContext}
              onChange={(e) => {
                const value = e.target.value;
                setGlobalContext(value);
                // Save to localStorage immediately as user types
                localStorage.setItem(`globalContext_${repoId}`, value);
              }}
              className="w-full bg-gray-900 border border-gray-600 text-white rounded p-3 text-sm focus:outline-none focus:border-blue-500"
              rows={4}
              placeholder="Tell us about your project... For example:&#10;- Key technologies and frameworks used&#10;- Important milestones or pivots&#10;- Specific challenges overcome&#10;- Tools or dependencies that were crucial&#10;- Team dynamics or collaboration patterns"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setEditingGlobalContext(false);
                  setGlobalContext(globalContext); // Reset to original value
                }}
                className="text-gray-400 hover:text-gray-300 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => updateGlobalContext(globalContext)}
                disabled={savingContext}
                className="text-blue-400 hover:text-blue-300 text-sm disabled:opacity-50"
              >
                {savingContext ? "Saving..." : "Save Context"}
              </button>
            </div>
          </div>
        ) : (
          <div
            className="bg-gray-900 border border-gray-600 rounded p-3 cursor-pointer hover:border-gray-500"
            onClick={() => setEditingGlobalContext(true)}
          >
            {globalContext ? (
              <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                {globalContext}
              </p>
            ) : (
              <p className="text-gray-500 text-sm italic">
                Click to add context about your project...
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Click to edit project context
            </p>
          </div>
        )}
      </div>

      {/* Story Content */}
      {story && story.chapters.length > 0 ? (
        <div className="space-y-6">
          {story.chapters.map((chapter, index) => (
            <div
              key={chapter.id}
              className="bg-gray-800 border border-gray-700 rounded-lg p-6"
            >
              {/* Chapter Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  {editingTitle === chapter.id ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-medium text-gray-400">
                        Chapter {index + 1}
                      </span>
                      <input
                        type="text"
                        value={chapter.title}
                        onChange={(e) => {
                          setStory((prev) => {
                            if (!prev) return null;
                            return {
                              ...prev,
                              chapters: prev.chapters.map((c) =>
                                c.id === chapter.id
                                  ? { ...c, title: e.target.value }
                                  : c
                              ),
                            };
                          });
                        }}
                        onBlur={() =>
                          updateChapterTitle(chapter.id, chapter.title)
                        }
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            updateChapterTitle(chapter.id, chapter.title);
                          }
                        }}
                        className="text-lg font-medium text-white bg-gray-700 border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={() => setEditingTitle(null)}
                        className="text-gray-400 hover:text-gray-300"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <h4
                      className="text-lg font-medium text-white cursor-pointer hover:text-blue-300"
                      onClick={() => setEditingTitle(chapter.id)}
                    >
                      <span className="text-gray-400 mr-2">
                        Chapter {index + 1}
                      </span>
                      {chapter.title || `Chapter ${index + 1}`}
                    </h4>
                  )}
                  <p className="text-sm text-gray-400 mt-1">
                    {chapter.commitCount} commit
                    {chapter.commitCount !== 1 ? "s" : ""} •{" "}
                    {(() => {
                      const commits = chapterCommits[chapter.id];
                      if (commits && commits.length > 0) {
                        return calculateDateRange(commits);
                      }
                      return "Loading dates...";
                    })()}
                  </p>
                </div>
                <button
                  onClick={() => regenerateChapterSummary(chapter.id)}
                  disabled={regenerating === chapter.id}
                  className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {regenerating === chapter.id ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                      Regenerating...
                    </>
                  ) : (
                    "Regenerate Summary"
                  )}
                </button>
              </div>

              {/* Chapter Summary */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-300 mb-2">
                  Summary
                </h5>
                {editingSummary === chapter.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={chapter.summary}
                      onChange={(e) => {
                        setStory((prev) => {
                          if (!prev) return null;
                          return {
                            ...prev,
                            chapters: prev.chapters.map((c) =>
                              c.id === chapter.id
                                ? { ...c, summary: e.target.value }
                                : c
                            ),
                          };
                        });
                      }}
                      onBlur={() =>
                        updateChapterSummary(chapter.id, chapter.summary)
                      }
                      className="w-full bg-gray-900 border border-gray-600 text-white rounded p-3 text-sm focus:outline-none focus:border-blue-500"
                      rows={4}
                      autoFocus
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setEditingSummary(null)}
                        className="text-gray-400 hover:text-gray-300 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() =>
                          updateChapterSummary(chapter.id, chapter.summary)
                        }
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="bg-gray-900 border border-gray-600 rounded p-3 cursor-pointer hover:border-gray-500"
                    onClick={() => setEditingSummary(chapter.id)}
                  >
                    <p className="text-gray-200 text-sm leading-relaxed">
                      {chapter.summary}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Click to edit summary
                    </p>
                  </div>
                )}
              </div>

              {/* Commit List */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-300 mb-2">
                  Included Commits ({chapter.commitCount})
                </h5>
                {loadingCommits[chapter.id] ? (
                  <div className="flex justify-center items-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  </div>
                ) : chapterCommits[chapter.id] ? (
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          setChapterCommits((prev) => {
                            const newCommits = { ...prev };
                            delete newCommits[chapter.id];
                            return newCommits;
                          });
                        }}
                        className="text-gray-400 hover:text-gray-300 text-sm font-medium"
                      >
                        Hide Details
                      </button>
                    </div>
                    <CommitDisplay
                      commits={chapterCommits[chapter.id]}
                      showAnalysis={false}
                      showGitHubLink={true}
                      showExpandButton={true}
                      className="max-h-96 overflow-y-auto"
                    />
                  </div>
                ) : (
                  <div className="bg-gray-900 border border-gray-600 rounded p-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        {chapter.commitShas.map((sha, idx) => (
                          <div
                            key={sha}
                            className="text-xs text-gray-400 font-mono"
                          >
                            {sha.slice(0, 7)}...
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => fetchChapterCommits(chapter.id)}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                      >
                        Load Details
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* User Notes */}
              <div>
                <h5 className="text-sm font-medium text-gray-300 mb-2">
                  Your Notes
                </h5>
                <textarea
                  className="w-full bg-gray-900 border border-gray-600 text-white rounded p-3 text-sm"
                  rows={3}
                  value={chapterNotes[chapter.id] || ""}
                  onChange={(e) => {
                    const newNotes = e.target.value;
                    setChapterNotes((prev) => ({
                      ...prev,
                      [chapter.id]: newNotes,
                    }));
                  }}
                  onBlur={(e) => updateChapterNotes(chapter.id, e.target.value)}
                  placeholder="Add your personal notes about this chapter..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your notes are automatically saved when you click away from
                  this field.
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : story ? (
        <div className="text-center py-8">
          <div className="text-gray-400">
            <svg
              className="mx-auto h-12 w-12 mb-4"
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
            <h3 className="text-lg font-medium text-white mb-2">
              No chapters generated yet
            </h3>
            <p className="text-gray-400">
              Click "Generate Chapters" to create an AI-powered story from your
              commits.
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-400">
            <svg
              className="mx-auto h-12 w-12 mb-4"
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
            <h3 className="text-lg font-medium text-white mb-2">
              Ready to create your story
            </h3>
            <p className="text-gray-400">
              Generate intelligent chapters that group your commits by themes
              and features.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntelligentStory;
