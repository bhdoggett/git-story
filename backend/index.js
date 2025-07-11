const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- GitHub OAuth ---
app.get("/auth/github", (req, res) => {
  // Redirect to GitHub OAuth
  // TODO: Implement
  res.send("GitHub OAuth not implemented yet");
});

app.get("/auth/github/callback", (req, res) => {
  // Handle GitHub OAuth callback
  // TODO: Implement
  res.send("GitHub OAuth callback not implemented yet");
});

// --- Fetch repo commits and diffs ---
app.get("/api/repos/:owner/:repo/commits", (req, res) => {
  // TODO: Fetch commits from GitHub API
  res.json({ message: "Fetch commits not implemented yet" });
});

app.get("/api/repos/:owner/:repo/commits/:sha/diff", (req, res) => {
  // TODO: Fetch commit diff from GitHub API
  res.json({ message: "Fetch commit diff not implemented yet" });
});

// --- Gemini narration ---
app.post("/api/narrate", (req, res) => {
  // TODO: Send commit data to Gemini API and return narration
  res.json({ message: "Gemini narration not implemented yet" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
