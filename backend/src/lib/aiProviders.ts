import axios from "axios";
import { EncryptionService } from "./encryption";

export interface AIProvider {
  name: string;
  analyzeCommit(commit: any): Promise<string>;
  analyzeBatchCommits(commits: any[]): Promise<string[]>;
  generateChapterSummary(commits: any[], title: string): Promise<string>;
  analyzeAndGroupCommits(commits: any[]): Promise<any[]>;
}

export interface CommitAnalysis {
  summary: string;
  reasoning: string;
}

export interface ChapterGroup {
  title: string;
  commitShas: string[];
  reasoning: string;
}

// OpenAI Provider
export class OpenAIProvider implements AIProvider {
  name = "OpenAI";
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "gpt-4") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async analyzeCommit(commit: any): Promise<string> {
    const prompt = `Analyze this Git commit and provide a clear, non-technical summary of what was accomplished:

Commit Message: ${commit.message}
Author: ${commit.author}
Date: ${commit.date}
Files Changed: ${commit.diff.length}

File Changes:
${commit.diff
  .map(
    (file: any) =>
      `- ${file.filename} (${file.status}): +${file.additions} -${file.deletions} lines`
  )
  .join("\n")}

Please provide a 2-3 sentence summary in plain English explaining what this commit accomplished, focusing on the business value or user impact.`;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content;
  }

  async analyzeBatchCommits(commits: any[]): Promise<string[]> {
    const analyses = await Promise.all(
      commits.map((commit) => this.analyzeCommit(commit))
    );
    return analyses;
  }

  async generateChapterSummary(commits: any[], title: string): Promise<string> {
    const commitSummaries = commits
      .map((c) => `- ${c.message} (${c.author})`)
      .join("\n");

    const prompt = `Create a chapter summary for "${title}" based on these commits:

${commitSummaries}

Please provide a 3-4 sentence summary that tells the story of what was accomplished in this chapter, written in an engaging narrative style.`;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content;
  }

  async analyzeAndGroupCommits(commits: any[]): Promise<ChapterGroup[]> {
    const commitList = commits
      .map((c) => `- ${c.sha.substring(0, 8)}: ${c.message}`)
      .join("\n");

    const prompt = `Analyze these Git commits and group them into logical chapters based on themes, features, or development phases:

${commitList}

Please group the commits into 3-8 chapters. For each chapter:
1. Provide a descriptive title
2. List the commit SHAs (first 8 characters) that belong to this chapter
3. Explain the reasoning for this grouping

Format your response as JSON:
[
  {
    "title": "Chapter Title",
    "commitShas": ["abc12345", "def67890"],
    "reasoning": "Explanation of why these commits belong together"
  }
]`;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    try {
      const content = response.data.choices[0].message.content;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("Invalid JSON response");
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      // Fallback: group by every 10 commits
      const groups: ChapterGroup[] = [];
      for (let i = 0; i < commits.length; i += 10) {
        const groupCommits = commits.slice(i, i + 10);
        groups.push({
          title: `Chapter ${Math.floor(i / 10) + 1}`,
          commitShas: groupCommits.map((c) => c.sha),
          reasoning: "Fallback grouping by commit count",
        });
      }
      return groups;
    }
  }
}

// Google Gemini Provider
export class GoogleGeminiProvider implements AIProvider {
  name = "Google Gemini";
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "gemini-1.5-flash") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async analyzeCommit(commit: any): Promise<string> {
    const prompt = `Analyze this Git commit and provide a clear, non-technical summary of what was accomplished:

Commit Message: ${commit.message}
Author: ${commit.author}
Date: ${commit.date}
Files Changed: ${commit.diff.length}

File Changes:
${commit.diff
  .map(
    (file: any) =>
      `- ${file.filename} (${file.status}): +${file.additions} -${file.deletions} lines`
  )
  .join("\n")}

Please provide a 2-3 sentence summary in plain English explaining what this commit accomplished, focusing on the business value or user impact.`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
      {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 200,
          temperature: 0.7,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        params: {
          key: this.apiKey,
        },
      }
    );

    return response.data.candidates[0].content.parts[0].text;
  }

  async analyzeBatchCommits(commits: any[]): Promise<string[]> {
    const analyses = await Promise.all(
      commits.map((commit) => this.analyzeCommit(commit))
    );
    return analyses;
  }

  async generateChapterSummary(commits: any[], title: string): Promise<string> {
    const commitSummaries = commits
      .map((c) => `- ${c.message} (${c.author})`)
      .join("\n");

    const prompt = `Create a chapter summary for "${title}" based on these commits:

${commitSummaries}

Please provide a 3-4 sentence summary that tells the story of what was accomplished in this chapter, written in an engaging narrative style.`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
      {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 300,
          temperature: 0.7,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        params: {
          key: this.apiKey,
        },
      }
    );

    return response.data.candidates[0].content.parts[0].text;
  }

  async analyzeAndGroupCommits(commits: any[]): Promise<ChapterGroup[]> {
    const commitList = commits
      .map((c) => `- ${c.sha.substring(0, 8)}: ${c.message}`)
      .join("\n");

    const prompt = `Analyze these Git commits and group them into logical chapters based on themes, features, or development phases:

${commitList}

Please group the commits into 3-8 chapters. For each chapter:
1. Provide a descriptive title
2. List the commit SHAs (first 8 characters) that belong to this chapter
3. Explain the reasoning for this grouping

Format your response as JSON:
[
  {
    "title": "Chapter Title",
    "commitShas": ["abc12345", "def67890"],
    "reasoning": "Explanation of why these commits belong together"
  }
]`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
      {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        params: {
          key: this.apiKey,
        },
      }
    );

    try {
      const content = response.data.candidates[0].content.parts[0].text;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("Invalid JSON response");
    } catch (error) {
      console.error("Error parsing Gemini response:", error);
      // Fallback: group by every 10 commits
      const groups: ChapterGroup[] = [];
      for (let i = 0; i < commits.length; i += 10) {
        const groupCommits = commits.slice(i, i + 10);
        groups.push({
          title: `Chapter ${Math.floor(i / 10) + 1}`,
          commitShas: groupCommits.map((c) => c.sha),
          reasoning: "Fallback grouping by commit count",
        });
      }
      return groups;
    }
  }
}

// Claude Provider
export class ClaudeProvider implements AIProvider {
  name = "Claude";
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "claude-3-haiku-20240307") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async analyzeCommit(commit: any): Promise<string> {
    const prompt = `Analyze this Git commit and provide a clear, non-technical summary of what was accomplished:

Commit Message: ${commit.message}
Author: ${commit.author}
Date: ${commit.date}
Files Changed: ${commit.diff.length}

File Changes:
${commit.diff
  .map(
    (file: any) =>
      `- ${file.filename} (${file.status}): +${file.additions} -${file.deletions} lines`
  )
  .join("\n")}

Please provide a 2-3 sentence summary in plain English explaining what this commit accomplished, focusing on the business value or user impact.`;

    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: this.model,
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
      }
    );

    return response.data.content[0].text;
  }

  async analyzeBatchCommits(commits: any[]): Promise<string[]> {
    const analyses = await Promise.all(
      commits.map((commit) => this.analyzeCommit(commit))
    );
    return analyses;
  }

  async generateChapterSummary(commits: any[], title: string): Promise<string> {
    const commitSummaries = commits
      .map((c) => `- ${c.message} (${c.author})`)
      .join("\n");

    const prompt = `Create a chapter summary for "${title}" based on these commits:

${commitSummaries}

Please provide a 3-4 sentence summary that tells the story of what was accomplished in this chapter, written in an engaging narrative style.`;

    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: this.model,
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
      }
    );

    return response.data.content[0].text;
  }

  async analyzeAndGroupCommits(commits: any[]): Promise<ChapterGroup[]> {
    const commitList = commits
      .map((c) => `- ${c.sha.substring(0, 8)}: ${c.message}`)
      .join("\n");

    const prompt = `Analyze these Git commits and group them into logical chapters based on themes, features, or development phases:

${commitList}

Please group the commits into 3-8 chapters. For each chapter:
1. Provide a descriptive title
2. List the commit SHAs (first 8 characters) that belong to this chapter
3. Explain the reasoning for this grouping

Format your response as JSON:
[
  {
    "title": "Chapter Title",
    "commitShas": ["abc12345", "def67890"],
    "reasoning": "Explanation of why these commits belong together"
  }
]`;

    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: this.model,
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
      }
    );

    try {
      const content = response.data.content[0].text;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("Invalid JSON response");
    } catch (error) {
      console.error("Error parsing Claude response:", error);
      // Fallback: group by every 10 commits
      const groups: ChapterGroup[] = [];
      for (let i = 0; i < commits.length; i += 10) {
        const groupCommits = commits.slice(i, i + 10);
        groups.push({
          title: `Chapter ${Math.floor(i / 10) + 1}`,
          commitShas: groupCommits.map((c) => c.sha),
          reasoning: "Fallback grouping by commit count",
        });
      }
      return groups;
    }
  }
}

// Perplexity Provider
export class PerplexityProvider implements AIProvider {
  name = "Perplexity";
  private apiKey: string;
  private model: string;

  constructor(
    apiKey: string,
    model: string = "llama-3.1-sonar-small-128k-online"
  ) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async analyzeCommit(commit: any): Promise<string> {
    const prompt = `Analyze this Git commit and provide a clear, non-technical summary of what was accomplished:

Commit Message: ${commit.message}
Author: ${commit.author}
Date: ${commit.date}
Files Changed: ${commit.diff.length}

File Changes:
${commit.diff
  .map(
    (file: any) =>
      `- ${file.filename} (${file.status}): +${file.additions} -${file.deletions} lines`
  )
  .join("\n")}

Please provide a 2-3 sentence summary in plain English explaining what this commit accomplished, focusing on the business value or user impact.`;

    const response = await axios.post(
      "https://api.perplexity.ai/chat/completions",
      {
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content;
  }

  async analyzeBatchCommits(commits: any[]): Promise<string[]> {
    const analyses = await Promise.all(
      commits.map((commit) => this.analyzeCommit(commit))
    );
    return analyses;
  }

  async generateChapterSummary(commits: any[], title: string): Promise<string> {
    const commitSummaries = commits
      .map((c) => `- ${c.message} (${c.author})`)
      .join("\n");

    const prompt = `Create a chapter summary for "${title}" based on these commits:

${commitSummaries}

Please provide a 3-4 sentence summary that tells the story of what was accomplished in this chapter, written in an engaging narrative style.`;

    const response = await axios.post(
      "https://api.perplexity.ai/chat/completions",
      {
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content;
  }

  async analyzeAndGroupCommits(commits: any[]): Promise<ChapterGroup[]> {
    const commitList = commits
      .map((c) => `- ${c.sha.substring(0, 8)}: ${c.message}`)
      .join("\n");

    const prompt = `Analyze these Git commits and group them into logical chapters based on themes, features, or development phases:

${commitList}

Please group the commits into 3-8 chapters. For each chapter:
1. Provide a descriptive title
2. List the commit SHAs (first 8 characters) that belong to this chapter
3. Explain the reasoning for this grouping

Format your response as JSON:
[
  {
    "title": "Chapter Title",
    "commitShas": ["abc12345", "def67890"],
    "reasoning": "Explanation of why these commits belong together"
  }
]`;

    const response = await axios.post(
      "https://api.perplexity.ai/chat/completions",
      {
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    try {
      const content = response.data.choices[0].message.content;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("Invalid JSON response");
    } catch (error) {
      console.error("Error parsing Perplexity response:", error);
      // Fallback: group by every 10 commits
      const groups: ChapterGroup[] = [];
      for (let i = 0; i < commits.length; i += 10) {
        const groupCommits = commits.slice(i, i + 10);
        groups.push({
          title: `Chapter ${Math.floor(i / 10) + 1}`,
          commitShas: groupCommits.map((c) => c.sha),
          reasoning: "Fallback grouping by commit count",
        });
      }
      return groups;
    }
  }
}

// AI Provider Factory
export class AIProviderFactory {
  static createProvider(
    providerType: string,
    encryptedApiKey: string
  ): AIProvider {
    console.log("🤖 AI PROVIDER FACTORY: Creating provider...");
    console.log("🤖 Provider type:", providerType);
    console.log("🤖 Encrypted key length:", encryptedApiKey.length);

    const apiKey = EncryptionService.decrypt(encryptedApiKey);

    console.log("🤖 Decrypted key length:", apiKey.length);
    console.log(
      "🤖 Decrypted key starts with:",
      apiKey.substring(0, 10) + "..."
    );

    switch (providerType.toLowerCase()) {
      case "openai":
        return new OpenAIProvider(apiKey);
      case "google":
      case "gemini":
        return new GoogleGeminiProvider(apiKey);
      case "claude":
        return new ClaudeProvider(apiKey);
      case "perplexity":
        return new PerplexityProvider(apiKey);
      default:
        throw new Error(`Unsupported AI provider: ${providerType}`);
    }
  }
}
