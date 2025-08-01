import { Router, Request, Response } from "express";
import axios from "axios";

const router = Router();

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

    // Delete the repository (cascading will handle stories and chapters)
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

    console.log("Fetching ALL commits for repo:", fullRepoName);

    // Fetch all commits from GitHub API using pagination
    let allCommits: any[] = [];
    let page = 1;
    let keepFetching = true;
    const perPage = 100;
    while (keepFetching) {
      const response = await axios.get(
        `https://api.github.com/repos/${fullRepoName}/commits`,
        {
          headers: {
            Authorization: `token ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
          params: {
            per_page: perPage,
            page,
          },
        }
      );
      if (response.data.length === 0) {
        keepFetching = false;
      } else {
        allCommits = allCommits.concat(response.data);
        page++;
        if (response.data.length < perPage) {
          keepFetching = false;
        }
      }
    }

    // Fetch diffs for each commit (limit to first 200 for performance)
    const commitsWithDiffs = await Promise.all(
      allCommits.map(async (commit: any) => {
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
      "commits with diffs (out of",
      allCommits.length,
      "total commits)"
    );
    res.json(commitsWithDiffs);
  } catch (error) {
    console.error("Error fetching commits:", error);
    res.status(500).json({ error: "Failed to fetch commits" });
  }
});

// Analyze a specific commit with AI provider
router.post(
  "/:repoId/commits/:commitSha/analyze",
  async (req: Request, res: Response) => {
    console.log("=== COMMIT ANALYSIS ENDPOINT CALLED ===");
    console.log("Commit analysis request received:", {
      repoId: req.params.repoId,
      commitSha: req.params.commitSha,
      userId: req.session.userId,
      isAuthenticated: req.isAuthenticated(),
    });

    try {
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
      console.log("🔍 Fetching commit from GitHub:", {
        fullRepoName,
        commitSha,
      });

      const commitResponse = await axios.get(
        `https://api.github.com/repos/${fullRepoName}/commits/${commitSha}`,
        {
          headers: {
            Authorization: `token ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      console.log("✅ GitHub API response status:", commitResponse.status);

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

      // Get user's active AI provider
      const aiProvider = await prisma.aIProvider.findFirst({
        where: {
          userId: req.session.userId,
          isActive: true,
        },
      });

      console.log("AI Provider check:", {
        hasUserProvider: !!aiProvider,
        hasEnvKey: !!process.env.GEMINI_API_KEY,
        envKeyLength: process.env.GEMINI_API_KEY?.length || 0,
      });

      if (!aiProvider) {
        // Fallback to environment variable Google Gemini if available
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (geminiApiKey) {
          console.log(
            "No user AI provider found, using environment Gemini API key as fallback"
          );
          try {
            const { GoogleGeminiProvider } = require("../lib/aiProviders");
            const provider = new GoogleGeminiProvider(geminiApiKey);
            const analysis = await provider.analyzeCommit(commit);
            res.json({ analysis, commit });
            return;
          } catch (error) {
            console.error("Error with Gemini fallback:", error);
            return res.status(500).json({
              error:
                "Failed to analyze commit with Gemini fallback: " +
                (error instanceof Error ? error.message : "Unknown error"),
            });
          }
        } else {
          return res.status(503).json({
            error:
              "No active AI provider found. Please add an AI provider in your settings or configure GEMINI_API_KEY environment variable.",
          });
        }
      }

      // Use user's configured AI provider
      try {
        const { AIProviderFactory } = require("../lib/aiProviders");
        const provider = AIProviderFactory.createProvider(
          aiProvider.provider,
          aiProvider.apiKey
        );
        const analysis = await provider.analyzeCommit(commit);
        res.json({ analysis, commit });
      } catch (error) {
        console.error("Error with user AI provider:", error);
        return res.status(500).json({
          error:
            "Failed to analyze commit with user AI provider: " +
            (error instanceof Error ? error.message : "Unknown error"),
        });
      }
    } catch (error) {
      console.error("Error analyzing commit:", error);
      res.status(500).json({ error: "Failed to analyze commit" });
    }
  }
);

// Analyze multiple commits with AI provider
router.post(
  "/:repoId/commits/analyze-batch",
  async (req: Request, res: Response) => {
    try {
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
      const validCommits = commits.filter((commit) => commit !== null);

      // Get user's active AI provider
      const aiProvider = await prisma.aIProvider.findFirst({
        where: {
          userId: req.session.userId,
          isActive: true,
        },
      });

      if (!aiProvider) {
        // Fallback to environment variable Google Gemini if available
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (geminiApiKey) {
          console.log(
            "No user AI provider found, using environment Gemini API key as fallback"
          );
          const { GoogleGeminiProvider } = require("../lib/aiProviders");
          const provider = new GoogleGeminiProvider(geminiApiKey);
          const analyses = await provider.analyzeBatchCommits(validCommits);
          res.json({ analyses });
          return;
        } else {
          return res.status(503).json({
            error:
              "No active AI provider found. Please add an AI provider in your settings or configure GEMINI_API_KEY environment variable.",
          });
        }
      }

      // Use user's configured AI provider
      const { AIProviderFactory } = require("../lib/aiProviders");
      const provider = AIProviderFactory.createProvider(
        aiProvider.provider,
        aiProvider.apiKey
      );
      const analyses = await provider.analyzeBatchCommits(validCommits);

      res.json({ analyses });
    } catch (error) {
      console.error("Error analyzing commits:", error);
      res.status(500).json({ error: "Failed to analyze commits" });
    }
  }
);

// Generate a story for a repository
router.post("/:repoId/story", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const accessToken = req.session.accessToken;
    const repoId = req.params.repoId;
    if (!accessToken) {
      return res.status(401).json({ error: "No access token found" });
    }
    const { PrismaClient } = require("../generated/prisma");
    const prisma = new PrismaClient();
    const repo = await prisma.repo.findUnique({ where: { id: repoId } });
    if (!repo) {
      return res.status(404).json({ error: "Repository not found" });
    }
    if (repo.userId !== req.session.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const fullRepoName = repo.name;
    // Fetch all commits from GitHub API using pagination
    let allCommits: any[] = [];
    let page = 1;
    let keepFetching = true;
    const perPage = 100;
    while (keepFetching) {
      const response = await axios.get(
        `https://api.github.com/repos/${fullRepoName}/commits`,
        {
          headers: {
            Authorization: `token ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
          params: {
            per_page: perPage,
            page,
          },
        }
      );
      if (response.data.length === 0) {
        keepFetching = false;
      } else {
        allCommits = allCommits.concat(response.data);
        page++;
        if (response.data.length < perPage) {
          keepFetching = false;
        }
      }
    }
    // Group commits into chapters (simple: every 10 commits = 1 chapter)
    const chapters = [];
    for (let i = 0; i < allCommits.length; i += 10) {
      const chapterCommits = allCommits.slice(i, i + 10).map((commit: any) => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author.name,
        date: commit.commit.author.date,
        url: commit.html_url,
      }));
      chapters.push({ commits: chapterCommits, note: "" });
    }
    // Save story to DB
    const story = await prisma.story.create({
      data: {
        repoId: repo.id,
        chapters: chapters,
      },
    });
    res.json(story);
  } catch (error) {
    console.error("Error generating story:", error);
    res.status(500).json({ error: "Failed to generate story" });
  }
});

export default router;
