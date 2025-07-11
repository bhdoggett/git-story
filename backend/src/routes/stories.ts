import { Router, Request, Response } from "express";

const router = Router();

// --- Fetch repo commits ---
router.get("/repos/:owner/:repo/commits", (req: Request, res: Response) => {
  // TODO: Fetch commits from GitHub API
  res.json({ message: "Fetch commits not implemented yet" });
});

// --- Fetch commit diff ---
router.get(
  "/repos/:owner/:repo/commits/:sha/diff",
  (req: Request, res: Response) => {
    // TODO: Fetch commit diff from GitHub API
    res.json({ message: "Fetch commit diff not implemented yet" });
  }
);

// --- Gemini narration ---
router.post("/narrate", (req: Request, res: Response) => {
  // TODO: Send commit data to Gemini API and return narration
  res.json({ message: "Gemini narration not implemented yet" });
});

export default router;
