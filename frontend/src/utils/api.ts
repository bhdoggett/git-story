import axios from "axios";

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8001",
  withCredentials: true, // Include cookies for session auth
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - add auth headers if needed
api.interceptors.request.use(
  (config) => {
    // You can add auth headers here if needed in the future
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Only redirect on auth errors if we're not already on login page
    // AND if the request wasn't to the auth status endpoint (to prevent loops)
    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      window.location.pathname !== "/login" &&
      !error.config?.url?.includes("/auth/status")
    ) {
      // Clear user state if needed
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// API methods
export const apiClient = {
  // Auth endpoints
  auth: {
    status: () => api.get("/auth/status"),
    logout: () => api.get("/auth/logout"),
  },

  // Repository endpoints
  repos: {
    // GitHub repositories
    getGitHubRepos: () => api.get("/api/repos/github"),

    // Connected repositories
    getConnected: () => api.get("/api/repos/connected"),

    // Connect a repository
    connect: (data: {
      githubRepoId: number;
      name: string;
      full_name: string;
    }) => api.post("/api/repos/connect", data),

    // Disconnect a repository
    disconnect: (repoId: string) => api.delete(`/api/repos/${repoId}`),

    // Get commit history
    getCommits: (repoId: string) => api.get(`/api/repos/${repoId}/commits`),

    // Analyze single commit with Gemini
    analyzeCommit: (repoId: string, commitSha: string) =>
      api.post(`/api/repos/${repoId}/commits/${commitSha}/analyze`),

    // Analyze multiple commits with Gemini
    analyzeCommitsBatch: (repoId: string, commitShas: string[]) =>
      api.post(`/api/repos/${repoId}/commits/analyze-batch`, { commitShas }),

    // Generate a story for a repository
    generateStory: (repoId: string) => api.post(`/api/repos/${repoId}/story`),
  },

  // Story endpoints
  stories: {
    // Generate intelligent chapters for a repository
    generateChapters: (repoId: string, globalContext?: string) =>
      api.post(`/api/stories/generate-chapters/${repoId}`, { globalContext }),

    // Get story with chapters
    getStory: (repoId: string) => api.get(`/api/stories/story/${repoId}`),

    // New: Check for more recent commits for a story
    checkStoryUpdates: (repoId: string) =>
      api.get(`/api/stories/story/${repoId}/check-updates`),

    // New: On-demand AI analysis of pending updates (no modifications)
    analyzeStoryUpdates: (repoId: string) =>
      api.post(`/api/stories/story/${repoId}/analyze-updates`),

    // Update chapter notes
    updateChapterNotes: (chapterId: string, userNotes: string) =>
      api.put(`/api/stories/chapters/${chapterId}/notes`, { userNotes }),

    // Update chapter title
    updateChapterTitle: (chapterId: string, title: string) =>
      api.put(`/api/stories/chapters/${chapterId}/title`, { title }),

    // Update chapter summary
    updateChapterSummary: (chapterId: string, summary: string) =>
      api.put(`/api/stories/chapters/${chapterId}/summary`, { summary }),

    // Regenerate chapter summary
    regenerateChapterSummary: (chapterId: string) =>
      api.post(`/api/stories/chapters/${chapterId}/regenerate-summary`),

    // Get commit details for a chapter
    getChapterCommits: (chapterId: string) =>
      api.get(`/api/stories/chapters/${chapterId}/commits`),

    // Get global context for a story
    getGlobalContext: (repoId: string) =>
      api.get(`/api/stories/story/${repoId}/context`),

    // Update global context for a story
    updateGlobalContext: (repoId: string, globalContext: string) =>
      api.put(`/api/stories/story/${repoId}/context`, { globalContext }),
  },
};

export default api;
