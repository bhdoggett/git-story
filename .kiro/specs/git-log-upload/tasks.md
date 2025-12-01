# Implementation Plan

- [x] 1. Set up backend infrastructure for file upload

  - Install multer and @types/multer dependencies
  - Create upload middleware at `backend/src/middleware/upload.ts` with memory storage, file type validation (.txt only), and 100MB size limit
  - Configure multer to accept only text/plain MIME type and .txt extension
  - _Requirements: 2.3, 6.1, 6.2_

- [x] 2. Implement git log parser service

  - Create `backend/src/lib/gitLogParser.ts` with parseGitLog function
  - Implement commit extraction logic using COMMIT_START/COMMIT_END delimiters
  - Parse SHA, author (name and email), date, message, and file stats using regex patterns
  - Transform parsed commits to match GitHub API format for compatibility with existing AI functions
  - Implement error tracking for malformed commits while continuing to parse valid ones
  - Return ParseResult with commits array, errors array, and success metrics
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 2.1 Write unit tests for git log parser

  - Test parsing single commit, multiple commits, malformed commits, missing fields, and large files
  - Verify output format matches GitHub API structure
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Create upload API endpoint

  - Add POST `/api/stories/upload-git-log/:repoId` route in `backend/src/routes/stories.ts`
  - Apply requireAuth middleware and uploadGitLog middleware
  - Validate user owns the repository
  - Check if story already exists and return 409 if it does
  - Read uploaded file from memory buffer and convert to string
  - Call gitLogParser.parseGitLog() to extract commits
  - Pass parsed commits to existing analyzeAndGroupCommits() function
  - Generate chapters using existing generateChapterSummary() function
  - Store chapters in database with only commit SHAs
  - Return created story with chapters
  - Handle errors with appropriate status codes (400 for parsing errors, 409 for duplicates, 500 for server errors)
  - _Requirements: 3.5, 4.1, 4.2, 4.3, 4.4, 6.1, 6.2, 8.1, 8.3_

- [x] 3.1 Write integration tests for upload endpoint

  - Test successful upload and story creation
  - Test rejection when story already exists
  - Test authentication requirements
  - Test invalid file handling
  - Verify only SHAs stored in database
  - _Requirements: 3.5, 4.1, 4.2, 4.3, 4.4, 8.3_

- [x] 4. Create GitLogUploadInterface component

  - Create `frontend/src/components/GitLogUploadInterface.tsx` with props for repoId, repoName, and onUploadComplete callback
  - Display the git log command with repository name in a copyable code block
  - Implement copy-to-clipboard functionality for the command
  - Add explanation text that upload is only needed for initial story creation
  - Create drag-and-drop zone for file upload with visual feedback
  - Add file selection button as alternative to drag-and-drop
  - Implement file validation to accept only .txt files under 100MB
  - Display selected filename and file size
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_

- [x] 5. Implement upload progress and status handling

  - Add state management for upload, parsing, and generation phases
  - Display progress indicator during file upload
  - Show status messages for parsing and chapter generation phases
  - Implement error handling with user-friendly error messages
  - Display estimated time remaining during processing
  - Call onUploadComplete callback when story generation succeeds
  - _Requirements: 2.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 6. Integrate upload interface into IntelligentStory component

  - Modify `frontend/src/components/IntelligentStory.tsx` to conditionally render GitLogUploadInterface when no story exists
  - Pass repoId, repoName, and onUploadComplete callback to GitLogUploadInterface
  - Add success notification banner after upload completion explaining GitHub sync for future updates
  - Ensure existing story view remains unchanged when story exists
  - _Requirements: 4.5, 5.1, 5.2, 5.3, 5.4, 8.1, 8.2_

- [x] 7. Add API client function for git log upload

  - Create uploadGitLog function in `frontend/src/utils/api.ts`
  - Implement multipart/form-data request with file and optional globalContext
  - Handle upload progress tracking
  - Return created story with chapters
  - Handle error responses with appropriate error messages
  - _Requirements: 2.5, 7.1, 7.5_

- [x] 7.1 Write component tests for GitLogUploadInterface
  - Test command display and copy functionality
  - Test drag-and-drop and file selection
  - Test file type validation
  - Test progress display and error handling
  - Verify onUploadComplete callback invocation
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.4_
