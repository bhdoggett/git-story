import express, { Request, Response } from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import authRouter from "./routes/auth";
import reposRouter from "./routes/repos";
import storiesRouter from "./routes/stories";

dotenv.config();

const CLIENT_BASE_URL = process.env.CLIENT_BASE_URL || "http://localhost:5173";

const app = express();
app.use(cors({ origin: CLIENT_BASE_URL, credentials: true }));
app.use(express.json());

// --- Session middleware ---
const isProduction = process.env.NODE_ENV === "production";

app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction, // true in production, false in development
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
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
        "http://localhost:3000/auth/github/callback",
    },
    (accessToken: string, refreshToken: string, profile: any, done: any) => {
      // You can store/retrieve user info here
      return done(null, { profile, accessToken });
    }
  )
);

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.use("/auth", authRouter);
app.use("/api/repos", reposRouter);
app.use("/api/stories", storiesRouter);

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
