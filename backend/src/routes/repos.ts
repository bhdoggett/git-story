import { Router, Request, Response } from "express";
import axios from "axios";
import { GeminiService } from "../lib/geminiService";

const router = Router();

// Initialize Gemini service with error handling
let geminiService: GeminiService | null = null;
try {
  geminiService = new GeminiService();
} catch (error) {
  console.warn("Gemini service not available:", error instanceof Error ? error.message : String(error));
}

// Get user's GitHub repositories
router.get("/github", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const accessToken = req.session.accessToken;
    if (!accessToken) {
      return res.status(401).json({ error: "No access token found" });
    }

    // Fetch repositories from GitHub API
    const response = await axios.get("https://api.github.com/user/repos", {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
      params: {
        sort: "updated",
        per_page: 100,
      },
    });

    const repos = response.data.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      private: repo.private,
      html_url: repo.html_url,
      updated_at: repo.updated_at,
    }));

    res.json(repos);
  } catch (error) {
    console.error("Error fetching repositories:", error);
    res.status(500).json({ error: "Failed to fetch repositories" });
  }
});

// Connect a repository to the user
router.post("/connect", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { githubRepoId, name, full_name } = req.body;
    const userId = req.session.userId;

    if (!githubRepoId || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Import prisma here to avoid circular dependencies
    const { PrismaClient } = require("../generated/prisma");
    const prisma = new PrismaClient();

    // Check if repo is already connected
    const existingRepo = await prisma.repo.findFirst({
      where: {
        userId,
        githubRepoId: githubRepoId.toString(),
      },
    });

    if (existingRepo) {
      return res.status(400).json({ error: "Repository already connected" });
    }

    // Create new repo connection - store full_name in the name field for now
    const repo = await prisma.repo.create({
      data: {
        userId,
        githubRepoId: githubRepoId.toString(),
        name: full_name || name, // Store full_name if available, otherwise just name
        narration: [],
      },
    });

    res.json(repo);
  } catch (error) {
    console.error("Error connecting repository:", error);
    res.status(500).json({ error: "Failed to connect repository" });
  }
});

// Get user's connected repositories
router.get("/connected", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = req.session.userId;

    // Import prisma here to avoid circular dependencies
    const { PrismaClient } = require("../generated/prisma");
    const prisma = new PrismaClient();

    const repos = await prisma.repo.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });

    res.json(repos);
  } catch (error) {
    console.error("Error fetching connected repositories:", error);
    res.status(500).json({ error: "Failed to fetch connected repositories" });
  }
});

// Disconnect a repository
router.delete("/:repoId", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const repoId = req.params.repoId;
    const userId = req.session.userId;

    // Import prisma here to avoid circular dependencies
    const { PrismaClient } = require("../generated/prisma");
    const prisma = new PrismaClient();

    // Check if repo exists and belongs to user
    const repo = await prisma.repo.findFirst({
      where: {
        id: repoId,
        userId,
      },
    });

    if (!repo) {
      return res.status(404).json({ error: "Repository not found" });
    }

    // Delete the repository
    await prisma.repo.delete({
      where: { id: repoId },
    });

    res.json({ message: "Repository disconnected successfully" });
  } catch (error) {
    console.error("Error disconnecting repository:", error);
    res.status(500).json({ error: "Failed to disconnect repository" });
  }
});

// Get commit history for a connected repository
router.get("/:repoId/commits", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const accessToken = req.session.accessToken;
    const repoId = req.params.repoId;

    if (!accessToken) {
      return res.status(401).json({ error: "No access token found" });
    }

    // Get repository info from database
    const { PrismaClient } = require("../generated/prisma");
    const prisma = new PrismaClient();

    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
    });

    if (!repo) {
      return res.status(404).json({ error: "Repository not found" });
    }

    // Check if user owns this repository
    if (repo.userId !== req.session.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Use the full repository name stored in the database
    const fullRepoName = repo.name; // This should now contain "owner/repo-name"

    console.log("Fetching commits for repo:", fullRepoName);

    // Fetch commits from GitHub API
    const response = await axios.get(
      `https://api.github.com/repos/${fullRepoName}/commits`,
      {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
        params: {
          per_page: 100, // Get last 100 commits
        },
      }
    );

    // Fetch diffs for each commit
    const commitsWithDiffs = await Promise.all(
      response.data.map(async (commit: any) => {
        try {
          // Get the diff for this commit
          const diffResponse = await axios.get(
            `https://api.github.com/repos/${fullRepoName}/commits/${commit.sha}`,
            {
              headers: {
                Authorization: `token ${accessToken}`,
                Accept: "application/vnd.github.v3+json",
              },
            }
          );

          const files = diffResponse.data.files || [];
          const diff = files.map((file: any) => ({
            filename: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            changes: file.changes,
            patch: file.patch,
          }));

          return {
            sha: commit.sha,
            message: commit.commit.message,
            author: commit.commit.author.name,
            date: commit.commit.author.date,
            url: commit.html_url,
            diff,
          };
        } catch (error) {
          console.error(`Error fetching diff for commit ${commit.sha}:`, error);
          return {
            sha: commit.sha,
            message: commit.commit.message,
            author: commit.commit.author.name,
            date: commit.commit.author.date,
            url: commit.html_url,
            diff: [],
          };
        }
      })
    );

    console.log(
      "Successfully fetched",
      commitsWithDiffs.length,
      "commits with diffs"
    );
    res.json(commitsWithDiffs);
  } catch (error) {
    console.error("Error fetching commits:", error);
    res.status(500).json({ error: "Failed to fetch commits" });
  }
});

// Analyze a specific commit with Gemini
router.post("/:repoId/commits/:commitSha/analyze", async (req: Request, res: Response) => {
  try {
    // Check if Gemini service is available
    if (!geminiService) {
      return res.status(503).json({ error: "AI analysis service not available. Please check your Gemini API key configuration." });
    }

    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const accessToken = req.session.accessToken;
    const repoId = req.params.repoId;
    const commitSha = req.params.commitSha;

    if (!accessToken) {
      return res.status(401).json({ error: "No access token found" });
    }

    // Get repository info from database
    const { PrismaClient } = require("../generated/prisma");
    const prisma = new PrismaClient();

    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
    });

    if (!repo) {
      return res.status(404).json({ error: "Repository not found" });
    }

    // Check if user owns this repository
    if (repo.userId !== req.session.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const fullRepoName = repo.name;

    // Fetch the specific commit with diff from GitHub API
    const commitResponse = await axios.get(
      `https://api.github.com/repos/${fullRepoName}/commits/${commitSha}`,
      {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    const commitData = commitResponse.data;
    const files = commitData.files || [];
    const diff = files.map((file: any) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: file.patch,
    }));

    const commit = {
      sha: commitData.sha,
      message: commitData.commit.message,
      author: commitData.commit.author.name,
      date: commitData.commit.author.date,
      url: commitData.html_url,
      diff,
    };

    // Analyze the commit with Gemini
    const analysis = await geminiService.analyzeCommit(commit);

    res.json({ analysis, commit });
  } catch (error) {
    console.error("Error analyzing commit:", error);
    res.status(500).json({ error: "Failed to analyze commit" });
  }
});

// Analyze multiple commits with Gemini
router.post("/:repoId/commits/analyze-batch", async (req: Request, res: Response) => {
  try {
    // Check if Gemini service is available
    if (!geminiService) {
      return res.status(503).json({ error: "AI analysis service not available. Please check your Gemini API key configuration." });
    }

    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const accessToken = req.session.accessToken;
    const repoId = req.params.repoId;
    const { commitShas } = req.body; // Array of commit SHAs to analyze

    if (!accessToken) {
      return res.status(401).json({ error: "No access token found" });
    }

    if (!commitShas || !Array.isArray(commitShas)) {
      return res.status(400).json({ error: "commitShas array is required" });
    }

    // Get repository info from database
    const { PrismaClient } = require("../generated/prisma");
    const prisma = new PrismaClient();

    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
    });

    if (!repo) {
      return res.status(404).json({ error: "Repository not found" });
    }

    // Check if user owns this repository
    if (repo.userId !== req.session.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const fullRepoName = repo.name;

    // Fetch commits with diffs
    const commits = await Promise.all(
      commitShas.map(async (sha: string) => {
        try {
          const commitResponse = await axios.get(
            `https://api.github.com/repos/${fullRepoName}/commits/${sha}`,
            {
              headers: {
                Authorization: `token ${accessToken}`,
                Accept: "application/vnd.github.v3+json",
              },
            }
          );

          const commitData = commitResponse.data;
          const files = commitData.files || [];
          const diff = files.map((file: any) => ({
            filename: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            changes: file.changes,
            patch: file.patch,
          }));

          return {
            sha: commitData.sha,
            message: commitData.commit.message,
            author: commitData.commit.author.name,
            date: commitData.commit.author.date,
            url: commitData.html_url,
            diff,
          };
        } catch (error) {
          console.error(`Error fetching commit ${sha}:`, error);
          return null;
        }
      })
    );

    // Filter out failed commits
    const validCommits = commits.filter(commit => commit !== null);

    // Analyze commits with Gemini
    const analyses = await geminiService.analyzeBatchCommits(validCommits);

    res.json({ analyses });
  } catch (error) {
    console.error("Error analyzing commits:", error);
    res.status(500).json({ error: "Failed to analyze commits" });
  }
});

export default router;
