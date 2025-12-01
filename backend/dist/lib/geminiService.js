"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiService = void 0;
const generative_ai_1 = require("@google/generative-ai");
class GeminiService {
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY environment variable is required");
        }
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    }
    async analyzeCommit(commit) {
        try {
            // Prepare the commit data for analysis
            const commitSummary = this.createCommitSummary(commit);
            const prompt = `You are a technical communicator who explains code changes to non-technical stakeholders. 

      Given the following commit information, please generate a clear, layman's terms explanation of what happened in this commit. Focus on:
      1. What functionality was added, changed, or removed
      2. Why this change might be important
      3. How it affects the overall project
      4. Use simple, non-technical language

      Be concise but informative. Avoid technical jargon and focus on the business impact or user-facing changes when possible.

      Commit Information:
      ${commitSummary}

      Please provide a 2-3 sentence explanation in simple terms:`;
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        }
        catch (error) {
            console.error("Error analyzing commit with Gemini:", error);
            throw new Error("Failed to analyze commit");
        }
    }
    createCommitSummary(commit) {
        let summary = `Commit Message: ${commit.message}\n`;
        summary += `Author: ${commit.author}\n`;
        summary += `Date: ${commit.date}\n`;
        summary += `Commit Hash: ${commit.sha}\n\n`;
        summary += `Files Changed (${commit.diff.length} files):\n`;
        commit.diff.forEach((file, index) => {
            summary += `${index + 1}. ${file.filename} (${file.status})\n`;
            summary += `   - Additions: ${file.additions} lines\n`;
            summary += `   - Deletions: ${file.deletions} lines\n`;
            // Include a snippet of the patch if available (truncated for context)
            if (file.patch) {
                const patchLines = file.patch.split("\n");
                const relevantLines = patchLines
                    .filter((line) => line.startsWith("+") || line.startsWith("-"))
                    .slice(0, 10); // Limit to first 10 relevant lines
                if (relevantLines.length > 0) {
                    summary += `   - Key changes:\n`;
                    relevantLines.forEach((line) => {
                        summary += `     ${line.substring(0, 100)}${line.length > 100 ? "..." : ""}\n`;
                    });
                }
            }
            summary += "\n";
        });
        // Truncate if too long to avoid token limits
        if (summary.length > 8000) {
            summary = summary.substring(0, 8000) + "\n... (truncated for analysis)";
        }
        return summary;
    }
    async analyzeBatchCommits(commits) {
        const analyses = {};
        // Process commits one at a time to respect free tier rate limits (15 RPM)
        // With 5 second delays, we can safely process 12 commits per minute
        for (let i = 0; i < commits.length; i++) {
            const commit = commits[i];
            try {
                const analysis = await this.analyzeCommit(commit);
                analyses[commit.sha] = analysis;
            }
            catch (error) {
                console.error(`Failed to analyze commit ${commit.sha}:`, error);
                analyses[commit.sha] = "Analysis unavailable - please try again later.";
            }
            // Wait 5 seconds between requests to stay well under 15 RPM limit
            if (i < commits.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 5000));
            }
        }
        return analyses;
    }
}
exports.GeminiService = GeminiService;
