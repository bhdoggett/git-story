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
    generateChapters: (repoId: string) =>
      api.post(`/api/stories/generate-chapters/${repoId}`),

    // Get story with chapters
    getStory: (repoId: string) => api.get(`/api/stories/story/${repoId}`),

    // Update chapter notes
    updateChapterNotes: (chapterId: string, userNotes: string) =>
      api.put(`/api/stories/chapters/${chapterId}/notes`, { userNotes }),

    // Regenerate chapter summary
    regenerateChapterSummary: (chapterId: string) =>
      api.post(`/api/stories/chapters/${chapterId}/regenerate-summary`),
  },

  // AI Provider endpoints
  aiProviders: {
    // Get user's AI providers
    getAll: () => api.get("/api/ai-providers"),

    // Add new AI provider
    add: (data: { provider: string; name: string; apiKey: string }) =>
      api.post("/api/ai-providers", data),

    // Update AI provider
    update: (
      providerId: string,
      data: { name?: string; apiKey?: string; isActive?: boolean }
    ) => api.put(`/api/ai-providers/${providerId}`, data),

    // Delete AI provider
    delete: (providerId: string) =>
      api.delete(`/api/ai-providers/${providerId}`),

    // Test AI provider connection
    test: (providerId: string) =>
      api.post(`/api/ai-providers/${providerId}/test`),
  },
};

export default api;
