import express, { Request, Response } from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";

dotenv.config();

const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// --- Session middleware ---
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // Set to true if using HTTPS
  })
);

// --- Passport setup ---
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((obj: any, done) => {
  done(null, obj);
});

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      callbackURL:
        process.env.GITHUB_CALLBACK_URL ||
        "http://localhost:3001/auth/github/callback",
    },
    (accessToken: string, refreshToken: string, profile: any, done: any) => {
      // You can store/retrieve user info here
      return done(null, { profile, accessToken });
    }
  )
);

// --- GitHub OAuth routes ---
app.get(
  "/auth/github",
  passport.authenticate("github", { scope: ["user", "repo"] })
);

app.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/" }),
  (req: Request, res: Response) => {
    // Successful authentication, redirect or respond
    res.redirect("http://localhost:5173");
  }
);

// --- Fetch repo commits and diffs ---
app.get("/api/repos/:owner/:repo/commits", (req: Request, res: Response) => {
  // TODO: Fetch commits from GitHub API
  res.json({ message: "Fetch commits not implemented yet" });
});

app.get(
  "/api/repos/:owner/:repo/commits/:sha/diff",
  (req: Request, res: Response) => {
    // TODO: Fetch commit diff from GitHub API
    res.json({ message: "Fetch commit diff not implemented yet" });
  }
);

// --- Gemini narration ---
app.post("/api/narrate", (req: Request, res: Response) => {
  // TODO: Send commit data to Gemini API and return narration
  res.json({ message: "Gemini narration not implemented yet" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
