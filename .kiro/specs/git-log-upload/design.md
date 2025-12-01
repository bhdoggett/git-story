# Design Document

## Overview

This feature adds git log file upload capability to the Git Story System, enabling users to generate initial stories for large repositories without hitting GitHub API rate limits. The solution involves creating a new upload interface in the frontend, a git log parser service in the backend, and integrating with the existing chapter generation workflow. The uploaded file is processed in-memory and discarded after parsing, with only commit SHAs stored in the database as per the current architecture.

## Architecture

### High-Level Flow

1. **User initiates story creation** → Frontend checks if story exists
2. **If no story exists** → Display upload interface with git command and drag-and-drop zone
3. **User uploads .txt file** → Frontend sends file to backend via multipart/form-data
4. **Backend parses file** → Extract commit data (SHA, message, author, date, diffs)
5. **Pass to existing AI service** → Use current `analyzeAndGroupCommits` and `generateChapterSummary` functions
6. **Store chapters in database** → Save only commit SHAs (no schema changes needed)
7. **Delete uploaded file** → Clean up temporary storage
8. **Display generated story** → Show chapters to user with success notification

### Component Architecture

```
Frontend (React + TypeScript)
├── GitLogUploadInterface (new component)
│   ├── Command display with copy button
│   ├── Drag-and-drop file zone
│   ├── Upload progress indicator
│   └── Status messages
└── IntelligentStory (modified)
    └── Conditional rendering: upload UI vs existing story UI

Backend (Express + TypeScript)
├── /routes/stories.ts (modified)
│   └── POST /api/stories/upload-git-log/:repoId
├── /lib/gitLogParser.ts (new service)
│   ├── parseGitLog(fileContent: string)
│   ├── extractCommit(lines: string[])
│   └── validateCommitData(commit: any)
└── /middleware/upload.ts (new middleware)
    └── multer configuration for .txt files
```

## Components and Interfaces

### Frontend Components

#### GitLogUploadInterface Component

**Location:** `frontend/src/components/GitLogUploadInterface.tsx`

**Props:**

```typescript
interface GitLogUploadInterfaceProps {
  repoId: string;
  repoName: string;
  onUploadComplete: (story: Story) => void;
}
```

**State:**

```typescript
interface UploadState {
  file: File | null;
  uploading: boolean;
  parsing: boolean;
  generating: boolean;
  progress: number;
  error: string | null;
  estimatedTime: string | null;
}
```

**Key Features:**

- Display git command: `git log --all --pretty=format:"COMMIT_START%nSHA: %H%nAuthor: %an <%ae>%nDate: %ad%nMessage: %s%n%b%nCOMMIT_END" --date=iso --stat -p > git-log.txt`
- Copy-to-clipboard button for command
- Drag-and-drop zone with file validation (.txt only, max 100MB)
- File selection button as alternative
- Progress bar with status messages
- Error handling with user-friendly messages

#### IntelligentStory Component Modifications

**Location:** `frontend/src/components/IntelligentStory.tsx`

**Changes:**

- Add conditional rendering at the top of the component
- If `!story`, render `<GitLogUploadInterface />` instead of "Generate Chapters" button
- Pass `onUploadComplete` callback to refresh story data
- Add notification banner after successful upload explaining GitHub sync for future updates

### Backend Services

#### Git Log Parser Service

**Location:** `backend/src/lib/gitLogParser.ts`

**Interface:**

```typescript
interface ParsedCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
  };
  date: string;
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>;
}

interface ParseResult {
  commits: ParsedCommit[];
  errors: Array<{
    line: number;
    message: string;
  }>;
  totalCommits: number;
  successfullyParsed: number;
}

export function parseGitLog(fileContent: string): ParseResult;
```

**Parsing Strategy:**

1. Split file content by `COMMIT_START` delimiter
2. For each commit block:
   - Extract SHA using regex: `/SHA:\s*([a-f0-9]{40})/i`
   - Extract author using regex: `/Author:\s*(.+?)\s*<(.+?)>/`
   - Extract date using regex: `/Date:\s*(.+)/`
   - Extract message (everything between "Message:" and file stats)
   - Parse file stats and diffs
3. Validate each commit has required fields (SHA, author, date, message)
4. Transform into format compatible with existing `analyzeAndGroupCommits` function
5. Return parsed commits and any errors encountered

**Error Handling:**

- Log malformed commits but continue parsing
- Track line numbers for debugging
- Return partial results if some commits fail
- Validate minimum data requirements (at least SHA and message)

#### Upload Middleware

**Location:** `backend/src/middleware/upload.ts`

**Configuration:**

```typescript
import multer from "multer";
import path from "path";

const storage = multer.memoryStorage(); // Store in memory, not disk

const fileFilter = (req: any, file: any, cb: any) => {
  if (
    file.mimetype === "text/plain" ||
    path.extname(file.originalname) === ".txt"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only .txt files are allowed"), false);
  }
};

export const uploadGitLog = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
});
```

**Benefits:**

- Memory storage avoids disk I/O
- Automatic cleanup after request completes
- Built-in file size limits
- MIME type validation

### Backend API Endpoint

**Route:** `POST /api/stories/upload-git-log/:repoId`

**Request:**

- Content-Type: `multipart/form-data`
- Body: `file` (the git log .txt file)
- Optional: `globalContext` (string field)

**Response:**

```typescript
{
  id: string;
  repoId: string;
  createdAt: string;
  chapters: Array<{
    id: string;
    title: string;
    summary: string;
    commitShas: string[];
    commitCount: number;
  }>;
}
```

**Implementation Flow:**

```typescript
1. Authenticate user (requireAuth middleware)
2. Validate repoId belongs to user
3. Check if story already exists (prevent duplicates)
4. Parse uploaded file using gitLogParser
5. Transform parsed commits to match GitHub API format
6. Call existing analyzeAndGroupCommits(commits, globalContext)
7. For each chapter group:
   - Call existing generateChapterSummary(commits, title, globalContext)
   - Create chapter in database with commitShas
8. Return story with chapters
9. File automatically cleaned up by multer (memory storage)
```

## Data Models

### No Schema Changes Required

The existing Prisma schema already supports this feature:

```prisma
model Story {
  id            String   @id @default(uuid())
  repo          Repo     @relation("RepoStories", fields: [repoId], references: [id], onDelete: Cascade)
  repoId        String
  globalContext String?
  createdAt     DateTime @default(now())
  chapters      Chapter[]
}

model Chapter {
  id          String   @id @default(uuid())
  story       Story    @relation(fields: [storyId], references: [id], onDelete: Cascade)
  storyId     String
  title       String?
  summary     String
  userNotes   String?
  commitShas  String[] // Array of commit SHAs - already supports our needs
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Key Points:**

- `commitShas` array stores only SHA strings (no full commit data)
- `globalContext` field already exists for project context
- No migrations needed
- Existing queries work unchanged

### Data Transformation

**Git Log Format → Parsed Format:**

```typescript
// Input from git log
"COMMIT_START
SHA: abc123...
Author: John Doe <john@example.com>
Date: 2024-01-15 10:30:00 -0500
Message: Add user authentication

 src/auth.ts | 45 ++++++++++++++++++++++++++++++++++++++++++
 1 file changed, 45 insertions(+)

diff --git a/src/auth.ts b/src/auth.ts
...
COMMIT_END"

// Output (compatible with existing AI functions)
{
  sha: "abc123...",
  commit: {
    message: "Add user authentication",
    author: {
      name: "John Doe",
      email: "john@example.com",
      date: "2024-01-15T10:30:00-05:00"
    }
  },
  files: [
    {
      filename: "src/auth.ts",
      status: "added",
      additions: 45,
      deletions: 0,
      changes: 45,
      patch: "..."
    }
  ]
}
```

## Error Handling

### Frontend Error Scenarios

1. **Invalid file type**

   - Message: "Please upload a .txt file containing your git log"
   - Action: Clear file selection, allow retry

2. **File too large (>100MB)**

   - Message: "File is too large. Maximum size is 100MB"
   - Action: Suggest filtering git log by date range

3. **Upload network error**

   - Message: "Upload failed. Please check your connection and try again"
   - Action: Retry button

4. **Parsing error**

   - Message: "Unable to parse git log file. Please ensure it was generated with the correct command"
   - Action: Show command again, allow retry

5. **Story already exists**
   - Message: "A story already exists for this repository. Use the Update button to sync new commits"
   - Action: Redirect to existing story view

### Backend Error Scenarios

1. **Malformed git log**

   - Log errors with line numbers
   - Continue parsing valid commits
   - Return partial results if >50% commits parsed successfully
   - Return 400 error if <50% commits parsed

2. **No valid commits found**

   - Return 400 with message: "No valid commits found in uploaded file"

3. **Story already exists**

   - Return 409 Conflict with existing story data

4. **AI service failure**

   - Fallback to simple grouping (every 10 commits)
   - Log error for monitoring
   - Return 200 with fallback chapters

5. **Database error**
   - Return 500 with generic message
   - Log full error details
   - Ensure no partial data saved (use transaction)

### Error Recovery

**Graceful Degradation:**

- If AI analysis fails, use simple commit grouping
- If some commits fail to parse, process the valid ones
- If file stats missing, store commits without diff data
- Always provide user feedback on what succeeded/failed

**Logging Strategy:**

```typescript
// Log levels
- ERROR: Critical failures (DB errors, auth failures)
- WARN: Partial failures (some commits unparseable)
- INFO: Successful operations with metrics
- DEBUG: Detailed parsing information

// Metrics to track
- Upload file size
- Number of commits in file
- Parsing success rate
- Processing time
- AI analysis time
```

## Testing Strategy

### Unit Tests

**Git Log Parser (`gitLogParser.test.ts`):**

- Parse valid git log with single commit
- Parse git log with multiple commits
- Handle malformed commit blocks
- Handle missing SHA
- Handle missing author
- Handle missing date
- Handle commits without diffs
- Handle large files (streaming)
- Validate output format matches GitHub API format

**Upload Middleware (`upload.test.ts`):**

- Accept valid .txt file
- Reject non-.txt files
- Reject files over size limit
- Handle missing file in request

### Integration Tests

**Upload Endpoint (`stories.integration.test.ts`):**

- Upload valid git log and create story
- Reject upload when story already exists
- Handle unauthenticated requests
- Handle invalid repoId
- Handle malformed git log file
- Verify chapters created correctly
- Verify only SHAs stored in database
- Verify file not persisted after processing

### Frontend Component Tests

**GitLogUploadInterface (`GitLogUploadInterface.test.tsx`):**

- Render command with copy button
- Handle file drag and drop
- Handle file selection via button
- Validate file type
- Show upload progress
- Display error messages
- Call onUploadComplete callback

### Manual Testing Checklist

- [ ] Generate git log from real repository
- [ ] Upload file via drag-and-drop
- [ ] Upload file via file selector
- [ ] Verify chapters generated correctly
- [ ] Verify commit details fetched from GitHub API
- [ ] Try uploading when story exists (should fail)
- [ ] Test with very large repository (10k+ commits)
- [ ] Test with repository containing merge commits
- [ ] Test with repository containing binary files
- [ ] Verify file cleanup after processing
- [ ] Test error scenarios (invalid file, network error)
- [ ] Verify notification about future GitHub sync

### Performance Testing

**Benchmarks:**

- Parse 1,000 commits: < 2 seconds
- Parse 10,000 commits: < 20 seconds
- Upload 10MB file: < 5 seconds
- End-to-end (upload + parse + AI + save): < 60 seconds for 1,000 commits

**Memory Considerations:**

- Use streaming for large files if needed
- Limit concurrent uploads per user
- Monitor memory usage during parsing
- Consider chunking AI analysis for very large repos

## Implementation Notes

### Git Command Explanation

The command displayed to users:

```bash
git log --all --pretty=format:"COMMIT_START%nSHA: %H%nAuthor: %an <%ae>%nDate: %ad%nMessage: %s%n%b%nCOMMIT_END" --date=iso --stat -p > git-log.txt
```

**Flags explained:**

- `--all`: Include all branches
- `--pretty=format:"..."`: Custom format with delimiters
- `%H`: Full commit hash (SHA)
- `%an`: Author name
- `%ae`: Author email
- `%ad`: Author date
- `%s`: Subject (first line of message)
- `%b`: Body (rest of message)
- `--date=iso`: ISO 8601 date format
- `--stat`: Show file statistics
- `-p`: Show patches (diffs)
- `> git-log.txt`: Output to file

### Reusing Existing Code

**No duplication needed:**

- Use existing `analyzeAndGroupCommits()` from `stories.ts`
- Use existing `generateChapterSummary()` from `stories.ts`
- Use existing Prisma models and queries
- Use existing error handling patterns
- Use existing authentication middleware

**Integration points:**

```typescript
// Transform parsed commits to match GitHub API format
const githubFormatCommits = parsedCommits.map((commit) => ({
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

// Then use existing functions
const chapterGroups = await analyzeAndGroupCommits(
  githubFormatCommits,
  globalContext
);
```

### Future Enhancements

**Not in scope for initial implementation:**

- Incremental uploads (only new commits)
- Support for other VCS systems (SVN, Mercurial)
- Automatic git log generation (requires local git access)
- Compressed file upload (.zip, .gz)
- Resume interrupted uploads
- Batch processing for multiple repositories

**Potential optimizations:**

- Cache parsed commits temporarily for retry scenarios
- Parallel processing of commit analysis
- Progressive chapter generation (show results as they're ready)
- WebSocket for real-time progress updates

## Security Considerations

### Input Validation

- Validate file size before processing
- Validate file type (MIME and extension)
- Sanitize commit messages before storing
- Validate SHA format (40 hex characters)
- Limit upload rate per user (rate limiting)

### Authentication & Authorization

- Require authentication for upload endpoint
- Verify user owns the repository
- Prevent duplicate story creation
- Use existing session-based auth

### Data Privacy

- Process files in memory (no disk persistence)
- Don't log sensitive commit content
- Respect repository privacy settings
- Clean up memory after processing

### Resource Protection

- Limit file size (100MB)
- Limit concurrent uploads per user
- Timeout long-running operations
- Monitor memory usage
- Rate limit API endpoint

## Deployment Considerations

### Environment Variables

No new environment variables needed. Uses existing:

- `DATABASE_URL`: Prisma connection
- `GEMINI_API_KEY`: AI service
- `SESSION_SECRET`: Authentication

### Dependencies

**New npm packages:**

```json
{
  "multer": "^1.4.5-lts.1",
  "@types/multer": "^1.4.11"
}
```

### Monitoring

**Metrics to track:**

- Upload success/failure rate
- Average file size
- Average processing time
- Parsing error rate
- AI service success rate
- Memory usage during processing

**Alerts:**

- Upload failure rate > 10%
- Processing time > 2 minutes
- Memory usage > 80%
- Parsing error rate > 20%

### Rollback Plan

If issues arise:

1. Feature flag to disable upload UI
2. Return 503 from upload endpoint
3. Direct users to existing GitHub API flow
4. No database rollback needed (no schema changes)
