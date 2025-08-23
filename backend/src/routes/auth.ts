import { Router, Request, Response } from "express";
import passport from "passport";
import prisma from "../lib/prisma";

const CLIENT_BASE_URL = process.env.CLIENT_BASE_URL || "http://localhost:5173";

const router = Router();

// --- Auth status endpoint ---
router.get("/status", (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    // Get user data from database
    const userId = req.session.userId;
    if (userId) {
      // Import prisma here to avoid circular dependencies
      const { PrismaClient } = require("../generated/prisma");
      const prisma = new PrismaClient();

      prisma.user
        .findUnique({
          where: { id: userId },
        })
        .then((user: any) => {
          if (user) {
            res.json({
              authenticated: true,
              user: {
                id: user.id,
                githubId: user.githubId,
                name: user.name,
                username: user.name, // Using name as username for now
              },
            });
          } else {
            res.status(401).json({ authenticated: false });
          }
        })
        .catch(() => {
          res.status(401).json({ authenticated: false });
        });
    } else {
      res.status(401).json({ authenticated: false });
    }
  } else {
    res.status(401).json({ authenticated: false });
  }
});

// --- Logout endpoint ---
router.get("/logout", (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Session destruction failed" });
      }
      res.redirect(`${CLIENT_BASE_URL}/login`);
    });
  });
});

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
        return res.redirect(`${CLIENT_BASE_URL}?error=auth_failed`);
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
      res.redirect(`${CLIENT_BASE_URL}/dashboard`);
    } catch (error) {
      console.error("Error in GitHub callback:", error);
      res.redirect(`${CLIENT_BASE_URL}/login?error=database_error`);
    }
  }
);

export default router;
