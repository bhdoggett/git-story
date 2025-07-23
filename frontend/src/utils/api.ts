import axios from "axios";

// Create axios instance with default config
const api = axios.create({
  baseURL: "http://localhost:8001",
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
    // Handle 401/403 errors - redirect to login
    if (error.response?.status === 401 || error.response?.status === 403) {
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
  },
};

export default api;
