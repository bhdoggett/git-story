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

export default router;
