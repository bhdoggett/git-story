import React, { useState, useEffect } from "react";
import { apiClient } from "../utils/api";

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

  useEffect(() => {
    fetchStory();
  }, [repoId]);

  const fetchStory = async () => {
    setLoading(true);
    try {
      const response = await apiClient.stories.getStory(repoId);
      setStory(response.data);

      // Initialize notes state
      const notes: { [chapterId: string]: string } = {};
      response.data.chapters.forEach((chapter: Chapter) => {
        notes[chapter.id] = chapter.userNotes || "";
      });
      setChapterNotes(notes);
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
      const response = await apiClient.stories.generateChapters(repoId);
      setStory(response.data);

      // Initialize notes state
      const notes: { [chapterId: string]: string } = {};
      response.data.chapters.forEach((chapter: Chapter) => {
        notes[chapter.id] = chapter.userNotes || "";
      });
      setChapterNotes(notes);
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">
            Story for {repoName}
          </h3>
          <p className="text-gray-400 text-sm">
            AI-powered chapter generation based on commit themes
          </p>
        </div>
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
                  <h4 className="text-lg font-medium text-white">
                    {chapter.title || `Chapter ${index + 1}`}
                  </h4>
                  <p className="text-sm text-gray-400 mt-1">
                    {chapter.commitCount} commit
                    {chapter.commitCount !== 1 ? "s" : ""} • Created{" "}
                    {new Date(chapter.createdAt).toLocaleDateString()}
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
                  AI Summary
                </h5>
                <div className="bg-gray-900 border border-gray-600 rounded p-3">
                  <p className="text-gray-200 text-sm leading-relaxed">
                    {chapter.summary}
                  </p>
                </div>
              </div>

              {/* Commit List */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-300 mb-2">
                  Included Commits ({chapter.commitCount})
                </h5>
                <div className="bg-gray-900 border border-gray-600 rounded p-3 max-h-32 overflow-y-auto">
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
                </div>
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
