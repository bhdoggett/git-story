import { GoogleGenerativeAI } from "@google/generative-ai";

interface DiffFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
  diff: DiffFile[];
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async analyzeCommit(commit: Commit): Promise<string> {
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
    } catch (error) {
      console.error("Error analyzing commit with Gemini:", error);
      throw new Error("Failed to analyze commit");
    }
  }

  private createCommitSummary(commit: Commit): string {
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

  async analyzeBatchCommits(
    commits: Commit[]
  ): Promise<{ [sha: string]: string }> {
    const analyses: { [sha: string]: string } = {};

    // Process commits in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < commits.length; i += batchSize) {
      const batch = commits.slice(i, i + batchSize);
      const batchPromises = batch.map(async (commit) => {
        try {
          const analysis = await this.analyzeCommit(commit);
          return { sha: commit.sha, analysis };
        } catch (error) {
          console.error(`Failed to analyze commit ${commit.sha}:`, error);
          return {
            sha: commit.sha,
            analysis: "Analysis unavailable - please try again later.",
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ sha, analysis }) => {
        analyses[sha] = analysis;
      });

      // Add a small delay between batches to be respectful of API limits
      if (i + batchSize < commits.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return analyses;
  }
}
