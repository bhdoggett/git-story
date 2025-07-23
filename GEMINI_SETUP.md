# Gemini AI Integration Setup

This guide explains how to set up the Google Gemini AI integration for analyzing Git commits in layman's terms.

## Getting a Gemini API Key

1. Visit [Google AI Studio](https://ai.google.dev/)
2. Sign in with your Google account
3. Click "Get API Key" 
4. Create a new API key or use an existing one
5. Copy the API key

## Configuration

1. In the `backend` directory, copy the environment template:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Open the `.env` file and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your-actual-api-key-here
   ```

3. Restart the backend server:
   ```bash
   npm run dev
   ```

## How It Works

The Gemini AI integration analyzes Git commits and provides explanations in simple, non-technical language:

- **Individual Analysis**: Click the "Analyze" button on any commit to get an AI explanation
- **Batch Analysis**: Click "Analyze All with AI" to analyze all visible commits at once
- **Smart Explanations**: The AI focuses on what changed, why it matters, and the business impact

## What Gets Analyzed

For each commit, Gemini receives:
- Commit message and metadata
- List of changed files
- Code additions and deletions
- Key code snippets (truncated for context)

## Privacy & Rate Limits

- Only commit metadata and diffs are sent to Google's Gemini API
- The app processes commits in batches of 5 to respect API rate limits
- Analyses are cached in the frontend session but not stored permanently
- Your repository code is not stored by the AI service

## Troubleshooting

### "AI analysis service not available"
- Check that your `GEMINI_API_KEY` is set correctly in the `.env` file
- Ensure you've restarted the backend server after adding the API key
- Verify your API key is valid at [Google AI Studio](https://ai.google.dev/)

### Analysis takes too long
- Large commits with many files may take longer to analyze
- Batch analysis processes commits sequentially with delays to avoid rate limits
- Consider analyzing smaller batches of commits at a time

### API Rate Limits
- The free tier of Gemini has rate limits
- If you hit rate limits, wait a few minutes before trying again
- Consider upgrading to a paid plan for higher limits if needed