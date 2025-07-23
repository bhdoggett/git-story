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

    const { githubRepoId, name } = req.body;
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

    // Create new repo connection
    const repo = await prisma.repo.create({
      data: {
        userId,
        githubRepoId: githubRepoId.toString(),
        name,
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

export default router;
