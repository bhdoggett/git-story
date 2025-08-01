import { Router, Request, Response } from "express";
import { AIProviderFactory } from "../lib/aiProviders";
import { EncryptionService } from "../lib/encryption";

const router = Router();

// Import prisma for database operations
const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

// Helper function to analyze commits and group them by themes
async function analyzeAndGroupCommits(commits: any[], userId: string) {
  // Import prisma here to avoid circular dependencies
  const { PrismaClient } = require("../generated/prisma");
  const prisma = new PrismaClient();

  // Get user's active AI provider
  const aiProvider = await prisma.aIProvider.findFirst({
    where: {
      userId,
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
      return await provider.analyzeAndGroupCommits(commits);
    } else {
      throw new Error(
        "No active AI provider found. Please add an AI provider in your settings or configure GEMINI_API_KEY environment variable."
      );
    }
  }

  try {
    // Create AI provider instance
    const provider = AIProviderFactory.createProvider(
      aiProvider.provider,
      aiProvider.apiKey
    );

    // Use the provider to analyze and group commits
    return await provider.analyzeAndGroupCommits(commits);
  } catch (error) {
    console.error("Error analyzing commits:", error);
    // Fallback: group commits in batches of 5
    const chapters = [];
    for (let i = 0; i < commits.length; i += 5) {
      const batch = commits.slice(i, i + 5);
      chapters.push({
        title: `Chapter ${Math.floor(i / 5) + 1}`,
        commitShas: batch.map((c) => c.sha),
        reasoning: "Fallback grouping",
      });
    }
    return chapters;
  }
}

// Helper function to generate chapter summary
async function generateChapterSummary(
  commits: any[],
  chapterTitle: string,
  userId: string
) {
  // Import prisma here to avoid circular dependencies
  const { PrismaClient } = require("../generated/prisma");
  const prisma = new PrismaClient();

  // Get user's active AI provider
  const aiProvider = await prisma.aIProvider.findFirst({
    where: {
      userId,
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
      return await provider.generateChapterSummary(commits, chapterTitle);
    } else {
      throw new Error(
        "No active AI provider found. Please add an AI provider in your settings or configure GEMINI_API_KEY environment variable."
      );
    }
  }

  try {
    // Create AI provider instance
    const provider = AIProviderFactory.createProvider(
      aiProvider.provider,
      aiProvider.apiKey
    );

    // Use the provider to generate chapter summary
    return await provider.generateChapterSummary(commits, chapterTitle);
  } catch (error) {
    console.error("Error generating chapter summary:", error);
    return `Summary of ${chapterTitle}: Multiple commits were made to improve the codebase.`;
  }
}

// Generate intelligent chapters for a repository
router.post(
  "/generate-chapters/:repoId",
  async (req: Request, res: Response) => {
    try {
      const { repoId } = req.params;
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get the repository
      const repo = await prisma.repo.findFirst({
        where: { id: repoId, userId },
        include: { user: true },
      });

      if (!repo) {
        return res.status(404).json({ error: "Repository not found" });
      }

      // Fetch commits from GitHub API
      const accessToken = req.session.accessToken;
      if (!accessToken) {
        return res.status(401).json({ error: "No GitHub access token" });
      }

      const githubResponse = await fetch(
        `https://api.github.com/repos/${repo.name}/commits?per_page=100`,
        {
          headers: {
            Authorization: `token ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!githubResponse.ok) {
        return res
          .status(500)
          .json({ error: "Failed to fetch commits from GitHub" });
      }

      const commits = await githubResponse.json();

      // Analyze and group commits
      const chapterGroups = await analyzeAndGroupCommits(commits, userId);

      // Create or update story
      let story = await prisma.story.findFirst({
        where: { repoId },
        include: { chapters: true },
      });

      if (!story) {
        story = await prisma.story.create({
          data: { repoId },
          include: { chapters: true },
        });
      } else {
        // Clear existing chapters
        await prisma.chapter.deleteMany({
          where: { storyId: story.id },
        });
      }

      // Generate chapters with summaries
      const chapters = [];
      for (const group of chapterGroups) {
        const chapterCommits = commits.filter((c: any) =>
          group.commitShas.includes(c.sha)
        );
        const summary = await generateChapterSummary(
          chapterCommits,
          group.title,
          userId
        );

        const chapter = await prisma.chapter.create({
          data: {
            storyId: story.id,
            title: group.title,
            summary,
            commitShas: group.commitShas,
          },
        });

        chapters.push(chapter);
      }

      res.json({
        storyId: story.id,
        chapters: chapters.map((chapter) => ({
          id: chapter.id,
          title: chapter.title,
          summary: chapter.summary,
          userNotes: chapter.userNotes,
          commitShas: chapter.commitShas,
          commitCount: chapter.commitShas.length,
        })),
      });
    } catch (error) {
      console.error("Error generating chapters:", error);
      res.status(500).json({ error: "Failed to generate chapters" });
    }
  }
);

// Get story with chapters
router.get("/story/:repoId", async (req: Request, res: Response) => {
  try {
    const { repoId } = req.params;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const story = await prisma.story.findFirst({
      where: {
        repoId,
        repo: { userId },
      },
      include: {
        chapters: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!story) {
      return res.status(404).json({ error: "Story not found" });
    }

    res.json({
      id: story.id,
      repoId: story.repoId,
      createdAt: story.createdAt,
      chapters:
        story.chapters?.map((chapter: any) => ({
          id: chapter.id,
          title: chapter.title,
          summary: chapter.summary,
          userNotes: chapter.userNotes,
          commitShas: chapter.commitShas,
          commitCount: chapter.commitShas.length,
          createdAt: chapter.createdAt,
          updatedAt: chapter.updatedAt,
        })) || [],
    });
  } catch (error) {
    console.error("Error fetching story:", error);
    res.status(500).json({ error: "Failed to fetch story" });
  }
});

// Update chapter notes
router.put(
  "/chapters/:chapterId/notes",
  async (req: Request, res: Response) => {
    try {
      const { chapterId } = req.params;
      const { userNotes } = req.body;
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const chapter = await prisma.chapter.findFirst({
        where: { id: chapterId },
        include: {
          story: {
            include: {
              repo: true,
            },
          },
        },
      });

      if (!chapter || chapter.story.repo.userId !== userId) {
        return res.status(404).json({ error: "Chapter not found" });
      }

      const updatedChapter = await prisma.chapter.update({
        where: { id: chapterId },
        data: { userNotes },
      });

      res.json({
        id: updatedChapter.id,
        userNotes: updatedChapter.userNotes,
        updatedAt: updatedChapter.updatedAt,
      });
    } catch (error) {
      console.error("Error updating chapter notes:", error);
      res.status(500).json({ error: "Failed to update notes" });
    }
  }
);

// Regenerate chapter summary
router.post(
  "/chapters/:chapterId/regenerate-summary",
  async (req: Request, res: Response) => {
    try {
      const { chapterId } = req.params;
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const chapter = await prisma.chapter.findFirst({
        where: { id: chapterId },
        include: {
          story: {
            include: {
              repo: true,
            },
          },
        },
      });

      if (!chapter || chapter.story.repo.userId !== userId) {
        return res.status(404).json({ error: "Chapter not found" });
      }

      // Fetch commit details from GitHub
      const accessToken = req.session.accessToken;
      if (!accessToken) {
        return res.status(401).json({ error: "No GitHub access token" });
      }

      const commits = [];
      for (const sha of chapter.commitShas) {
        const response = await fetch(
          `https://api.github.com/repos/${chapter.story.repo.name}/commits/${sha}`,
          {
            headers: {
              Authorization: `token ${accessToken}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );

        if (response.ok) {
          const commit = await response.json();
          commits.push(commit);
        }
      }

      // Generate new summary
      const newSummary = await generateChapterSummary(
        commits,
        chapter.title || "Chapter",
        userId
      );

      const updatedChapter = await prisma.chapter.update({
        where: { id: chapterId },
        data: { summary: newSummary },
      });

      res.json({
        id: updatedChapter.id,
        summary: updatedChapter.summary,
        updatedAt: updatedChapter.updatedAt,
      });
    } catch (error) {
      console.error("Error regenerating summary:", error);
      res.status(500).json({ error: "Failed to regenerate summary" });
    }
  }
);

export default router;
