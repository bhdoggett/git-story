import { Router, Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../lib/prisma";

const router = Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Helper function to analyze commits and group them by themes
async function analyzeAndGroupCommits(commits: any[], globalContext?: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const contextSection = globalContext
    ? `\n\nProject Context:\n${globalContext}\n\nUse this context to better understand the project's goals, technologies, and development patterns when grouping commits.`
    : "";

  const prompt = `
  Analyze these Git commits and group them into logical chapters based on themes, features, or contributions.
  Each group should represent a coherent development effort or feature implementation.
  ${contextSection}
  
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

// Helper function to analyze whether new commits should be appended to the last chapter or form a new chapter
async function analyzeNewCommitsAgainstLastChapter(
  lastChapter: { title?: string | null; summary: string; commits: any[] },
  newCommits: any[],
  globalContext?: string
) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const contextSection = globalContext
    ? `\n\nProject Context:\n${globalContext}\n\nUse this context to better understand if the new work continues the last chapter or starts a new theme.`
    : "";

  const prompt = `
You are helping decide how to organize a software development story into chapters.\n${contextSection}

We have the LAST CHAPTER with metadata and its commits, and we also have NEW COMMITS that happened afterwards. Decide whether the NEW COMMITS should:\n- be APPENDED to the last chapter (if they clearly continue the same theme/feature/refactor), OR\n- become a NEW CHAPTER (if they start a distinct theme/feature/refactor).\n
Return STRICT JSON with this shape:\n{
  "decision": "append" | "new",
  "reasoning": string,
  "proposedTitle": string | null,
  "newCommitShas": string[]
}

LAST CHAPTER:\nTitle: ${lastChapter.title || "(untitled)"}\nSummary: ${lastChapter.summary}\nCommits:\n${lastChapter.commits
    .map(
      (c: any) => `- ${c.sha}: ${c.commit.message} (author: ${c.commit.author?.name || c.commit.author?.email || "unknown"}; date: ${c.commit.author?.date || "unknown"})\n  Files: ${(c.files || []).map((f: any) => f.filename).slice(0, 8).join(", ")}`
    )
    .join("\n")}\n
NEW COMMITS:\n${newCommits
    .map(
      (c: any) => `- ${c.sha}: ${c.commit.message} (author: ${c.commit.author?.name || c.commit.author?.email || "unknown"}; date: ${c.commit.author?.date || "unknown"})\n  Files: ${(c.files || []).map((f: any) => f.filename).slice(0, 8).join(", ")}`
    )
    .join("\n")}\n
Consider commit messages and touched files to determine continuity. If decision is "new", propose a concise human-friendly title (2-8 words) for the new chapter in proposedTitle. If decision is "append", proposedTitle should be null. Always include all new commit SHAs in newCommitShas. Only return JSON.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Could not parse JSON response");
  } catch (error) {
    console.error("Error analyzing new commits against last chapter:", error);
    // Fallback: default to new chapter if unsure
    return {
      decision: "new",
      reasoning: "Fallback decision due to analysis error.",
      proposedTitle: "New Work",
      newCommitShas: newCommits.map((c: any) => c.sha),
    };
  }
}

// Helper function to generate chapter summary
async function generateChapterSummary(
  commits: any[],
  chapterTitle: string,
  globalContext?: string
) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const contextSection = globalContext
    ? `\n\nProject Context:\n${globalContext}\n\nUse this context to provide more relevant and contextual summaries that align with the project's goals and technologies.`
    : "";

  const prompt = `
  Generate a clear, layman-friendly summary of this Git chapter: "${chapterTitle}"
  ${contextSection}
  
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
      const { globalContext } = req.body;
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
      const chapterGroups = await analyzeAndGroupCommits(
        commits,
        globalContext
      );

      // Create or update story
      let story = await prisma.story.findFirst({
        where: { repoId },
        include: { chapters: true },
      });

      if (!story) {
        story = await prisma.story.create({
          data: {
            repoId,
            globalContext: globalContext || null,
          },
          include: { chapters: true },
        });
      } else {
        // Clear existing chapters and update global context
        await prisma.chapter.deleteMany({
          where: { storyId: story.id },
        });
        await prisma.story.update({
          where: { id: story.id },
          data: { globalContext: globalContext || null },
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
          globalContext
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

// New: Check if there are more recent commits for a story and suggest how to integrate them
router.get(
  "/story/:repoId/check-updates",
  async (req: Request, res: Response) => {
    try {
      const { repoId } = req.params;
      const userId = req.session.userId;
      const accessToken = (req as any).session?.accessToken;

      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (!accessToken) {
        return res.status(401).json({ error: "No GitHub access token" });
      }

      // Load story with chapters and repo
      const story = await prisma.story.findFirst({
        where: { repoId },
        include: {
          chapters: { orderBy: { createdAt: "asc" } },
          repo: true,
        },
      });

      if (!story) {
        // No story yet: check if repo has any commits at all
        const repo = await prisma.repo.findFirst({
          where: { id: repoId, userId },
        });
        if (!repo) {
          return res.status(404).json({ error: "Repository not found" });
        }

        const recentResponse = await fetch(
          `https://api.github.com/repos/${repo.name}/commits?per_page=1`,
          {
            headers: {
              Authorization: `token ${accessToken}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );
        const hasAnyCommits = recentResponse.ok
          ? ((await recentResponse.json()) as any[]).length > 0
          : false;
        return res.json({
          hasNewCommits: hasAnyCommits,
          newCommitCount: hasAnyCommits ? undefined : 0,
          annotation: hasAnyCommits
            ? "There are commits in this repository. Generate a story to include them."
            : "No commits found for this repository.",
        });
      }

      const fullRepoName = story.repo.name; // expects owner/repo

      // Build a set of known SHAs from all existing chapters
      const knownShas = new Set<string>();
      for (const ch of story.chapters) {
        for (const sha of ch.commitShas) {
          knownShas.add(sha);
        }
      }

      // Fetch latest commits (until a known SHA or cap), only counting
      let page = 1;
      const perPage = 100;
      let newCount = 0;
      let stop = false;
      while (!stop && page <= 3) { // hard cap 300 for responsiveness
        const resp = await fetch(
          `https://api.github.com/repos/${fullRepoName}/commits?per_page=${perPage}&page=${page}`,
          {
            headers: {
              Authorization: `token ${accessToken}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );
        if (!resp.ok) break;
        const batch = await resp.json();
        if (!Array.isArray(batch) || batch.length === 0) break;
        for (const c of batch) {
          if (knownShas.has(c.sha)) {
            stop = true;
            break;
          }
          newCount += 1;
        }
        if (batch.length < perPage) break;
        page += 1;
      }

      if (newCount === 0) {
        return res.json({
          hasNewCommits: false,
          newCommitCount: 0,
          annotation: "Up to date",
        });
      }

      return res.json({
        hasNewCommits: true,
        newCommitCount: newCount,
        annotation: `There are ${newCount} new commits available.`,
      });
    } catch (error) {
      console.error("Error checking for story updates:", error);
      res.status(500).json({ error: "Failed to check for updates" });
    }
  }
);

// New: On-demand AI analysis of new commits vs last chapter (no DB modifications)
router.post(
  "/story/:repoId/analyze-updates",
  async (req: Request, res: Response) => {
    try {
      const { repoId } = req.params;
      const userId = req.session.userId;
      const accessToken = (req as any).session?.accessToken;

      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (!accessToken) {
        return res.status(401).json({ error: "No GitHub access token" });
      }

      // Load story with chapters and repo
      const story = await prisma.story.findFirst({
        where: { repoId },
        include: {
          chapters: { orderBy: { createdAt: "asc" } },
          repo: true,
        },
      });

      if (!story) {
        return res.status(404).json({ error: "Story not found" });
      }

      const fullRepoName = story.repo.name;

      // Known SHAs
      const knownShas = new Set<string>();
      for (const ch of story.chapters) {
        for (const sha of ch.commitShas) knownShas.add(sha);
      }

      // Gather new commits since last known
      let page = 1;
      const perPage = 100;
      const newCommits: any[] = [];
      let stop = false;
      while (!stop && page <= 3) {
        const resp = await fetch(
          `https://api.github.com/repos/${fullRepoName}/commits?per_page=${perPage}&page=${page}`,
          {
            headers: {
              Authorization: `token ${accessToken}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );
        if (!resp.ok) break;
        const batch = await resp.json();
        if (!Array.isArray(batch) || batch.length === 0) break;
        for (const c of batch) {
          if (knownShas.has(c.sha)) {
            stop = true;
            break;
          }
          newCommits.push(c);
        }
        if (batch.length < perPage) break;
        page += 1;
      }

      if (newCommits.length === 0) {
        return res.json({
          hasNewCommits: false,
          newCommitCount: 0,
          decision: null,
          annotation: "Up to date",
        });
      }

      // Fetch detailed info for new commits
      const detailedNewCommits: any[] = [];
      for (const c of newCommits) {
        try {
          const detailResp = await fetch(
            `https://api.github.com/repos/${fullRepoName}/commits/${c.sha}`,
            {
              headers: {
                Authorization: `token ${accessToken}`,
                Accept: "application/vnd.github.v3+json",
              },
            }
          );
          if (detailResp.ok) detailedNewCommits.push(await detailResp.json());
        } catch (e) {
          console.error("Error fetching detailed commit:", c.sha, e);
        }
      }

      // Prepare last chapter context
      const lastChapter = story.chapters[story.chapters.length - 1];
      const lastChapterCommitShas = lastChapter?.commitShas || [];
      const recentLastShas = lastChapterCommitShas.slice(
        Math.max(0, lastChapterCommitShas.length - 10)
      );

      const detailedLastCommits: any[] = [];
      for (const sha of recentLastShas) {
        try {
          const detailResp = await fetch(
            `https://api.github.com/repos/${fullRepoName}/commits/${sha}`,
            {
              headers: {
                Authorization: `token ${accessToken}`,
                Accept: "application/vnd.github.v3+json",
              },
            }
          );
          if (detailResp.ok) detailedLastCommits.push(await detailResp.json());
        } catch (e) {
          console.error("Error fetching detailed commit:", sha, e);
        }
      }

      // Analyze
      const analysis = await analyzeNewCommitsAgainstLastChapter(
        {
          title: lastChapter?.title ?? null,
          summary: lastChapter?.summary || "",
          commits: detailedLastCommits,
        },
        detailedNewCommits,
        story.globalContext || undefined
      );

      const decision = analysis.decision === "append" ? "append" : "new";
      const annotation =
        decision === "append"
          ? `There are ${newCommits.length} new commits. They probably belong in the last chapter.`
          : `There are ${newCommits.length} new commits. They likely form a new chapter.`;

      return res.json({
        hasNewCommits: true,
        newCommitCount: newCommits.length,
        decision,
        reasoning: analysis.reasoning,
        proposedTitle: analysis.proposedTitle || null,
        newCommitShas: analysis.newCommitShas || detailedNewCommits.map((c: any) => c.sha),
        annotation,
      });
    } catch (error) {
      console.error("Error analyzing story updates:", error);
      res.status(500).json({ error: "Failed to analyze updates" });
    }
  }
);

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

// Get global context for a story
router.get("/story/:repoId/context", async (req: Request, res: Response) => {
  try {
    const { repoId } = req.params;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const story = await prisma.story.findFirst({
      where: { repoId },
      include: {
        repo: true,
      },
    });

    if (!story || story.repo.userId !== userId) {
      return res.status(404).json({ error: "Story not found" });
    }

    res.json({ globalContext: story.globalContext || "" });
  } catch (error) {
    console.error("Error fetching global context:", error);
    res.status(500).json({ error: "Failed to fetch global context" });
  }
});

// Update global context for a story
router.put("/story/:repoId/context", async (req: Request, res: Response) => {
  try {
    const { repoId } = req.params;
    const { globalContext } = req.body;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const story = await prisma.story.findFirst({
      where: { repoId },
      include: {
        repo: true,
      },
    });

    if (!story || story.repo.userId !== userId) {
      return res.status(404).json({ error: "Story not found" });
    }

    const updatedStory = await prisma.story.update({
      where: { id: story.id },
      data: { globalContext: globalContext || null },
    });

    res.json({ globalContext: updatedStory.globalContext || "" });
  } catch (error) {
    console.error("Error updating global context:", error);
    res.status(500).json({ error: "Failed to update global context" });
  }
});

export default router;
