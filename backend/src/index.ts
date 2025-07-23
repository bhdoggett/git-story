import express, { Request, Response } from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import authRouter from "./routes/auth";
import reposRouter from "./routes/repos";

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
        "http://localhost:3000/auth/github/callback",
    },
    (accessToken: string, refreshToken: string, profile: any, done: any) => {
      // You can store/retrieve user info here
      return done(null, { profile, accessToken });
    }
  )
);

app.use("/auth", authRouter);
app.use("/api/repos", reposRouter);

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
