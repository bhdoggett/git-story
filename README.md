# Git Story

A web app that narrates the story of your GitHub repository's development using Google Gemini and GitHub APIs.

## Features

- Link your GitHub repositories via OAuth
- Fetch commit messages and diffs
- Use Gemini AI to analyze individual commits in layman's terms
- Batch analyze multiple commits at once
- Generate clear, non-technical explanations of code changes
- View the story in a modern React UI

## Tech Stack

- Frontend: Vite + React
- Backend: Node.js + Express
- APIs: GitHub, Gemini

## Setup

### 1. Clone the repo

```
git clone <repo-url>
cd git-story
```

### 2. Environment Variables

Copy `.env.example` to `.env` in the `backend` directory and fill in your API keys and secrets:

```bash
cd backend
cp .env.example .env
```

You'll need to set up:
- **GitHub OAuth App**: Create an OAuth app at https://github.com/settings/developers
- **Gemini API Key**: Get your free API key at https://ai.google.dev/

### 3. Install dependencies

```
cd backend
npm install
cd ../frontend
npm install
```

### 4. Run the app

- Start backend:
  ```
  cd backend
  npm run dev
  ```
- Start frontend:
  ```
  cd frontend
  npm run dev
  ```

## Directory Structure

```
/git-story
  /backend    # Express server, API logic
  /frontend   # Vite + React app
```

## License

MIT
