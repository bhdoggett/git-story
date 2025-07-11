import { Router, Request, Response } from "express";
import passport from "passport";

const router = Router();

// --- GitHub OAuth routes ---
router.get(
  "/github",
  passport.authenticate("github", { scope: ["user", "repo"] })
);

router.get(
  "/github/callback",
  passport.authenticate("github", { failureRedirect: "/" }),
  (req: Request, res: Response) => {
    // Successful authentication, redirect or respond
    res.redirect("http://localhost:5173");
  }
);

export default router;
