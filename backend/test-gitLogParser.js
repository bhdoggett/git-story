const {
  parseGitLog,
  transformToGitHubFormat,
} = require("./dist/lib/gitLogParser");

// Test data
const singleCommitLog = `COMMIT_START
SHA: abc123def456789012345678901234567890abcd
Author: John Doe <john@example.com>
Date: 2024-01-15 10:30:00 -0500
Message: Add user authentication feature

 src/auth.ts | 45 ++++++++++++++++++++++++++++++++++++++++++
 1 file changed, 45 insertions(+)
COMMIT_END`;

const multipleCommitsLog = `COMMIT_START
SHA: abc123def456789012345678901234567890abcd
Author: John Doe <john@example.com>
Date: 2024-01-15 10:30:00 -0500
Message: Add user authentication feature

 src/auth.ts | 45 ++++++++++++++++++++++++++++++++++++++++++
 1 file changed, 45 insertions(+)
COMMIT_END
COMMIT_START
SHA: def456abc789012345678901234567890abcdef12
Author: Jane Smith <jane@example.com>
Date: 2024-01-16 14:20:00 -0500
Message: Fix login bug

 src/login.ts | 12 ++++++------
 1 file changed, 6 insertions(+), 6 deletions(-)
COMMIT_END`;

const malformedCommitLog = `COMMIT_START
SHA: abc123def456789012345678901234567890abcd
Author: John Doe <john@example.com>
Date: 2024-01-15 10:30:00 -0500
Message: Valid commit

 src/auth.ts | 45 ++++++++++++++++++++++++++++++++++++++++++
COMMIT_END
COMMIT_START
Author: Missing SHA <test@example.com>
Date: 2024-01-16 14:20:00 -0500
Message: This commit is missing SHA
COMMIT_END
COMMIT_START
SHA: def456abc789012345678901234567890abcdef12
Author: Jane Smith <jane@example.com>
Date: 2024-01-17 09:00:00 -0500
Message: Another valid commit

 src/test.ts | 10 ++++++++++
COMMIT_END`;

const missingFieldsLog = `COMMIT_START
SHA: abc123def456789012345678901234567890abcd
Date: 2024-01-15 10:30:00 -0500
Message: Missing author field
COMMIT_END`;

const largeFilesLog = `COMMIT_START
SHA: abc123def456789012345678901234567890abcd
Author: John Doe <john@example.com>
Date: 2024-01-15 10:30:00 -0500
Message: Large refactoring

 src/file1.ts | 150 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 src/file2.ts | 200 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 src/file3.ts | 75 +++++++++++++++++++++++++++++++++++++
 src/file4.ts | 50 +++++++++++++++++++++++++++++
 src/file5.ts | 100 +++++++++++++++++++++++++++++++++++++++++++++++++
 5 files changed, 575 insertions(+)
COMMIT_END`;

// Test runner
function runTests() {
  let passed = 0;
  let failed = 0;

  console.log("Running Git Log Parser Tests...\n");

  // Test 1: Parse single commit
  try {
    console.log("Test 1: Parse single commit");
    const result = parseGitLog(singleCommitLog);

    if (result.commits.length !== 1) {
      throw new Error(`Expected 1 commit, got ${result.commits.length}`);
    }

    const commit = result.commits[0];
    if (commit.sha !== "abc123def456789012345678901234567890abcd") {
      throw new Error(`SHA mismatch: ${commit.sha}`);
    }
    if (commit.author.name !== "John Doe") {
      throw new Error(`Author name mismatch: ${commit.author.name}`);
    }
    if (commit.author.email !== "john@example.com") {
      throw new Error(`Author email mismatch: ${commit.author.email}`);
    }
    if (commit.message !== "Add user authentication feature") {
      throw new Error(`Message mismatch: ${commit.message}`);
    }
    if (result.errors.length !== 0) {
      throw new Error(`Expected 0 errors, got ${result.errors.length}`);
    }

    console.log("✅ PASSED\n");
    passed++;
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}\n`);
    failed++;
  }

  // Test 2: Parse multiple commits
  try {
    console.log("Test 2: Parse multiple commits");
    const result = parseGitLog(multipleCommitsLog);

    if (result.commits.length !== 2) {
      throw new Error(`Expected 2 commits, got ${result.commits.length}`);
    }
    if (result.successfullyParsed !== 2) {
      throw new Error(
        `Expected 2 successful parses, got ${result.successfullyParsed}`
      );
    }

    console.log("✅ PASSED\n");
    passed++;
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}\n`);
    failed++;
  }

  // Test 3: Handle malformed commits
  try {
    console.log("Test 3: Handle malformed commits");
    const result = parseGitLog(malformedCommitLog);

    if (result.commits.length !== 2) {
      throw new Error(`Expected 2 valid commits, got ${result.commits.length}`);
    }
    if (result.errors.length !== 1) {
      throw new Error(`Expected 1 error, got ${result.errors.length}`);
    }
    if (result.totalCommits !== 3) {
      throw new Error(`Expected 3 total commits, got ${result.totalCommits}`);
    }

    console.log("✅ PASSED\n");
    passed++;
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}\n`);
    failed++;
  }

  // Test 4: Handle missing fields
  try {
    console.log("Test 4: Handle missing fields");
    const result = parseGitLog(missingFieldsLog);

    if (result.commits.length !== 0) {
      throw new Error(`Expected 0 commits, got ${result.commits.length}`);
    }
    if (result.errors.length !== 1) {
      throw new Error(`Expected 1 error, got ${result.errors.length}`);
    }

    console.log("✅ PASSED\n");
    passed++;
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}\n`);
    failed++;
  }

  // Test 5: Handle large files
  try {
    console.log("Test 5: Handle large files");
    const result = parseGitLog(largeFilesLog);

    if (result.commits.length !== 1) {
      throw new Error(`Expected 1 commit, got ${result.commits.length}`);
    }

    const commit = result.commits[0];
    if (!commit.files || commit.files.length !== 5) {
      throw new Error(`Expected 5 files, got ${commit.files?.length || 0}`);
    }

    console.log("✅ PASSED\n");
    passed++;
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}\n`);
    failed++;
  }

  // Test 6: Verify GitHub API format transformation
  try {
    console.log("Test 6: Verify GitHub API format transformation");
    const parseResult = parseGitLog(singleCommitLog);
    const githubFormat = transformToGitHubFormat(parseResult.commits);

    if (githubFormat.length !== 1) {
      throw new Error(
        `Expected 1 commit in GitHub format, got ${githubFormat.length}`
      );
    }

    const commit = githubFormat[0];
    if (!commit.sha || !commit.commit || !commit.commit.author) {
      throw new Error("GitHub format structure is incorrect");
    }
    if (commit.sha !== "abc123def456789012345678901234567890abcd") {
      throw new Error(`SHA mismatch in GitHub format: ${commit.sha}`);
    }
    if (commit.commit.author.name !== "John Doe") {
      throw new Error(
        `Author name mismatch in GitHub format: ${commit.commit.author.name}`
      );
    }

    console.log("✅ PASSED\n");
    passed++;
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}\n`);
    failed++;
  }

  // Summary
  console.log("=".repeat(50));
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(50));

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests();
