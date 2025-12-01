"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGitLog = parseGitLog;
exports.transformToGitHubFormat = transformToGitHubFormat;
/**
 * Parses a git log text file and extracts commit information
 * @param fileContent The raw content of the git log file
 * @returns ParseResult containing parsed commits, errors, and metrics
 */
function parseGitLog(fileContent) {
    const commits = [];
    const errors = [];
    // Split by COMMIT_START delimiter
    const commitBlocks = fileContent
        .split("COMMIT_START")
        .filter((block) => block.trim());
    const totalCommits = commitBlocks.length;
    commitBlocks.forEach((block, index) => {
        try {
            const commit = parseCommitBlock(block, index);
            if (commit) {
                commits.push(commit);
            }
        }
        catch (error) {
            errors.push({
                line: index + 1,
                message: error instanceof Error ? error.message : "Unknown parsing error",
            });
        }
    });
    return {
        commits,
        errors,
        totalCommits,
        successfullyParsed: commits.length,
    };
}
/**
 * Parses a single commit block
 */
function parseCommitBlock(block, blockIndex) {
    // Remove COMMIT_END delimiter if present
    const cleanBlock = block.replace("COMMIT_END", "").trim();
    if (!cleanBlock) {
        return null;
    }
    // Extract SHA (required)
    const shaMatch = cleanBlock.match(/SHA:\s*([a-f0-9]{40})/i);
    if (!shaMatch) {
        throw new Error(`Missing or invalid SHA in commit block ${blockIndex + 1}`);
    }
    const sha = shaMatch[1];
    // Extract author name and email (required)
    const authorMatch = cleanBlock.match(/Author:\s*(.+?)\s*<(.+?)>/);
    if (!authorMatch) {
        throw new Error(`Missing or invalid author in commit block ${blockIndex + 1}`);
    }
    const authorName = authorMatch[1].trim();
    const authorEmail = authorMatch[2].trim();
    // Extract date (required)
    const dateMatch = cleanBlock.match(/Date:\s*(.+)/);
    if (!dateMatch) {
        throw new Error(`Missing date in commit block ${blockIndex + 1}`);
    }
    const date = dateMatch[1].trim();
    // Extract message (required)
    const messageMatch = cleanBlock.match(/Message:\s*(.+?)(?=\n\n|\n\s+\w+\s+\||$)/s);
    if (!messageMatch) {
        throw new Error(`Missing message in commit block ${blockIndex + 1}`);
    }
    const message = messageMatch[1].trim();
    // Extract file stats (optional)
    const files = parseFileStats(cleanBlock);
    return {
        sha,
        message,
        author: {
            name: authorName,
            email: authorEmail,
        },
        date,
        files: files.length > 0 ? files : undefined,
    };
}
/**
 * Parses file statistics and diffs from a commit block
 */
function parseFileStats(block) {
    const files = [];
    // Match file stat lines (e.g., " src/auth.ts | 45 ++++++++++++++++++++++++++++++++++++++++++")
    const statPattern = /^\s*(.+?)\s+\|\s+(\d+)\s+([+\-]+)/gm;
    let statMatch;
    while ((statMatch = statPattern.exec(block)) !== null) {
        const filename = statMatch[1].trim();
        const changes = parseInt(statMatch[2], 10);
        const changeSymbols = statMatch[3];
        const additions = (changeSymbols.match(/\+/g) || []).length;
        const deletions = (changeSymbols.match(/-/g) || []).length;
        // Determine status based on the diff
        let status = "modified";
        const diffPattern = new RegExp(`diff --git a/${filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} b/${filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([\\s\\S]*?)(?=diff --git|$)`, "i");
        const diffMatch = block.match(diffPattern);
        if (diffMatch) {
            const diffContent = diffMatch[0];
            if (diffContent.includes("new file mode")) {
                status = "added";
            }
            else if (diffContent.includes("deleted file mode")) {
                status = "removed";
            }
            else if (diffContent.includes("rename from")) {
                status = "renamed";
            }
        }
        // Extract patch for this file
        let patch;
        if (diffMatch) {
            patch = diffMatch[0].trim();
        }
        files.push({
            filename,
            status,
            additions,
            deletions,
            changes,
            patch,
        });
    }
    return files;
}
/**
 * Transforms parsed commits to match GitHub API format for compatibility with existing AI functions
 */
function transformToGitHubFormat(parsedCommits) {
    return parsedCommits.map((commit) => ({
        sha: commit.sha,
        commit: {
            message: commit.message,
            author: {
                name: commit.author.name,
                email: commit.author.email,
                date: commit.date,
            },
        },
        files: commit.files || [],
    }));
}
