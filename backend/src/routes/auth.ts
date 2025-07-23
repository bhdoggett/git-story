import { Router, Request, Response } from "express";
import passport from "passport";
import prisma from "../lib/prisma";

const router = Router();

// --- GitHub OAuth routes ---
router.get(
  "/github",
  passport.authenticate("github", { scope: ["user", "repo"] })
);

router.get(
  "/github/callback",
  passport.authenticate("github", { failureRedirect: "/" }),
  async (req: Request, res: Response) => {
    try {
      // Get user info from the session (set by Passport)
      const user = req.user as any;
      if (!user || !user.profile) {
        return res.redirect("http://localhost:5173?error=auth_failed");
      }

      const { profile, accessToken } = user;
      const githubId = profile.id.toString();
      const name = profile.displayName || profile.username;

      // Check if user exists in database
      let dbUser = await prisma.user.findUnique({
        where: { githubId },
      });

      if (!dbUser) {
        // Create new user
        dbUser = await prisma.user.create({
          data: {
            githubId,
            name,
          },
        });
      } else {
        // Update existing user's name
        dbUser = await prisma.user.update({
          where: { githubId },
          data: { name },
        });
      }

      // Store access token in session for later use
      req.session.accessToken = accessToken;
      req.session.userId = dbUser.id;

      res.redirect("http://localhost:5173?success=true");
    } catch (error) {
      console.error("Error in GitHub callback:", error);
      res.redirect("http://localhost:5173?error=database_error");
    }
  }
);

export default router;
