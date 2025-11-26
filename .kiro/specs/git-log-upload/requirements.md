# Requirements Document

## Introduction

This feature enables users to generate their initial repository story by uploading a text file containing the full git log with commit diffs, rather than relying solely on the GitHub API. This approach prevents rate limiting issues for large repositories during initial story creation. After the initial upload, users can continue to update their story incrementally using the existing GitHub API integration.

## Glossary

- **Git Story System**: The application that analyzes git commit history and generates narrative chapters
- **Upload Interface**: The UI component that displays the git command and accepts file uploads
- **Git Log Parser**: The backend service that processes uploaded git log text files
- **Chapter Generator**: The AI service that groups commits into thematic chapters
- **Story Database**: The PostgreSQL database storing story and chapter data with commit SHAs

## Requirements

### Requirement 1

**User Story:** As a user connecting a repository, I want to see instructions for generating a git log file, so that I can prepare the data needed for initial story creation

#### Acceptance Criteria

1. WHEN a user connects a repository and initiates story creation, THE Upload Interface SHALL display the bash command required to generate a git log text file with full commit diffs
2. THE Upload Interface SHALL display the command in a copyable format
3. THE Upload Interface SHALL include the repository name in the displayed command
4. THE Upload Interface SHALL explain that this upload is only needed for initial story creation

### Requirement 2

**User Story:** As a user with a generated git log file, I want to upload it via drag-and-drop or file selection, so that I can initiate story processing without manual API calls

#### Acceptance Criteria

1. THE Upload Interface SHALL provide a drag-and-drop zone for file upload
2. THE Upload Interface SHALL provide a file selection button as an alternative to drag-and-drop
3. THE Upload Interface SHALL accept only text files with .txt extension
4. WHEN a user drops or selects a file, THE Upload Interface SHALL display the filename and file size
5. THE Upload Interface SHALL provide visual feedback during file upload

### Requirement 3

**User Story:** As a user who has uploaded a git log file, I want the system to parse and process the commits, so that my story chapters are generated from the uploaded data

#### Acceptance Criteria

1. WHEN a git log file is uploaded, THE Git Log Parser SHALL extract individual commit records from the text file
2. THE Git Log Parser SHALL parse each commit's SHA, message, author name, author email, date, and diff data
3. THE Git Log Parser SHALL validate that each commit contains a valid SHA
4. IF a commit record is malformed, THEN THE Git Log Parser SHALL log the error and continue processing remaining commits
5. THE Git Log Parser SHALL pass the parsed commit data to the Chapter Generator

### Requirement 4

**User Story:** As a user whose git log has been processed, I want the system to generate story chapters using the uploaded data, so that I can view my repository's narrative without GitHub API limitations

#### Acceptance Criteria

1. WHEN parsed commits are received, THE Chapter Generator SHALL analyze and group commits using the existing AI analysis logic
2. THE Chapter Generator SHALL create chapter records in the Story Database
3. THE Story Database SHALL store only commit SHAs in the chapter records
4. THE Chapter Generator SHALL generate chapter titles and summaries using the commit data from the uploaded file
5. WHEN chapter generation completes, THE Git Story System SHALL display the generated story to the user

### Requirement 5

**User Story:** As a user whose initial story has been created via upload, I want to be notified about future update options, so that I understand I can use GitHub integration for incremental updates

#### Acceptance Criteria

1. WHEN initial story generation completes successfully, THE Upload Interface SHALL display a notification message
2. THE notification message SHALL inform the user that future story updates can be made via GitHub connection
3. THE notification message SHALL explain that no additional git log uploads are required for updates
4. THE Upload Interface SHALL provide a clear path to access the generated story

### Requirement 6

**User Story:** As a system administrator, I want uploaded git log files to be deleted after processing, so that storage is not consumed by temporary files

#### Acceptance Criteria

1. WHEN the Git Log Parser completes processing a git log file, THE Git Story System SHALL delete the uploaded file from storage
2. IF processing fails, THEN THE Git Story System SHALL delete the uploaded file from storage
3. THE Git Story System SHALL delete uploaded files within 5 minutes of upload completion or failure

### Requirement 7

**User Story:** As a user uploading a git log file, I want to see progress feedback, so that I understand the system is processing my data

#### Acceptance Criteria

1. WHEN file upload begins, THE Upload Interface SHALL display an upload progress indicator
2. WHEN file parsing begins, THE Upload Interface SHALL display a parsing status message
3. WHEN chapter generation begins, THE Upload Interface SHALL display a generation status message
4. IF an error occurs during processing, THEN THE Upload Interface SHALL display a clear error message with guidance
5. THE Upload Interface SHALL display estimated time remaining during processing

### Requirement 8

**User Story:** As a user with an existing story, I want the upload option to be available only for initial story creation, so that I am not confused about when to use uploads versus GitHub sync

#### Acceptance Criteria

1. WHERE a repository already has a story, THE Upload Interface SHALL not display the git log upload option
2. WHERE a repository already has a story, THE Git Story System SHALL direct users to the GitHub sync functionality
3. THE Git Story System SHALL prevent duplicate story creation via upload for repositories with existing stories
