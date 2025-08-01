import { Router, Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../lib/prisma";

const router = Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Helper function to analyze commits and group them by themes
async function analyzeAndGroupCommits(commits: any[]) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
  Analyze these Git commits and group them into logical chapters based on themes, features, or contributions.
  Each group should represent a coherent development effort or feature implementation.
  
  Commits:
  ${commits
    .map(
      (commit) => `
  SHA: ${commit.sha}
  Message: ${commit.commit.message}
  Author: ${commit.commit.author.name}
  Date: ${commit.commit.author.date}
  Files changed: ${commit.files?.length || 0} files
  `
    )
    .join("\n")}
  
  Return a JSON array of chapter objects with this structure:
  [
    {
      "title": "Chapter title describing the theme/feature",
      "commitShas": ["sha1", "sha2", ...],
      "reasoning": "Brief explanation of why these commits belong together"
    }
  ]
  
  Focus on:
  - Feature implementations
  - Bug fixes
  - Refactoring efforts
  - Documentation updates
  - Performance improvements
  - UI/UX changes
  
  Group commits that work toward the same goal or represent the same type of change.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from the response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Could not parse JSON response");
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
async function generateChapterSummary(commits: any[], chapterTitle: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
  Generate a clear, layman-friendly summary of this Git chapter: "${chapterTitle}"
  
  Commits in this chapter:
  ${commits
    .map(
      (commit) => `
  - ${commit.commit.message}
    Author: ${commit.commit.author.name}
    Date: ${commit.commit.author.date}
    Files: ${commit.files?.length || 0} files changed
  `
    )
    .join("\n")}
  
  Write a summary that:
  - Explains what was accomplished in simple terms
  - Highlights the main changes and improvements
  - Uses non-technical language when possible
  - Is 2-3 sentences long
  - Focuses on the impact and value of the changes
  
  Summary:
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Error generating summary:", error);
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
      const chapterGroups = await analyzeAndGroupCommits(commits);

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
          group.title
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
        chapter.title || "Chapter"
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

// Update chapter title
router.put(
  "/chapters/:chapterId/title",
  async (req: Request, res: Response) => {
    try {
      const { chapterId } = req.params;
      const { title } = req.body;
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (!title || title.trim() === "") {
        return res.status(400).json({ error: "Title is required" });
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
        data: { title: title.trim() },
      });

      res.json({
        id: updatedChapter.id,
        title: updatedChapter.title,
        updatedAt: updatedChapter.updatedAt,
      });
    } catch (error) {
      console.error("Error updating chapter title:", error);
      res.status(500).json({ error: "Failed to update title" });
    }
  }
);

// Update chapter summary
router.put(
  "/chapters/:chapterId/summary",
  async (req: Request, res: Response) => {
    try {
      const { chapterId } = req.params;
      const { summary } = req.body;
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (!summary || summary.trim() === "") {
        return res.status(400).json({ error: "Summary is required" });
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
        data: { summary: summary.trim() },
      });

      res.json({
        id: updatedChapter.id,
        summary: updatedChapter.summary,
        updatedAt: updatedChapter.updatedAt,
      });
    } catch (error) {
      console.error("Error updating chapter summary:", error);
      res.status(500).json({ error: "Failed to update summary" });
    }
  }
);

// Get commit details for a chapter (for displaying diffs)
router.get(
  "/chapters/:chapterId/commits",
  async (req: Request, res: Response) => {
    try {
      const { chapterId } = req.params;
      const userId = req.session.userId;
      const accessToken = req.session.accessToken;

      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (!accessToken) {
        return res.status(401).json({ error: "No GitHub access token" });
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
      const commits = [];
      for (const sha of chapter.commitShas) {
        try {
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
            commits.push({
              sha: commit.sha,
              message: commit.commit.message,
              author: commit.commit.author.name,
              date: commit.commit.author.date,
              url: commit.html_url,
              diff:
                commit.files?.map((file: any) => ({
                  filename: file.filename,
                  status: file.status,
                  additions: file.additions,
                  deletions: file.deletions,
                  changes: file.changes,
                  patch: file.patch,
                })) || [],
            });
          }
        } catch (error) {
          console.error(`Error fetching commit ${sha}:`, error);
        }
      }

      res.json({ commits });
    } catch (error) {
      console.error("Error fetching chapter commits:", error);
      res.status(500).json({ error: "Failed to fetch commits" });
    }
  }
);

export default router;
