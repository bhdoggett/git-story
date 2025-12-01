import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GitLogUploadInterface from "./GitLogUploadInterface";
import axios from "axios";

// Mock axios
vi.mock("axios");
const mockedAxios = vi.mocked(axios);

describe("GitLogUploadInterface", () => {
  const mockRepoId = "test-repo-123";
  const mockRepoName = "test-repo";
  const mockOnUploadComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  describe("Command Display and Copy Functionality", () => {
    it("should display the git log command with repository name", () => {
      render(
        <GitLogUploadInterface
          repoId={mockRepoId}
          repoName={mockRepoName}
          onUploadComplete={mockOnUploadComplete}
        />
      );

      const command = screen.getByText(/git log --all --pretty=format/);
      expect(command).toBeInTheDocument();
      expect(command.textContent).toContain("test_repo_git-log.txt");
    });

    it("should copy command to clipboard when copy button is clicked", async () => {
      render(
        <GitLogUploadInterface
          repoId={mockRepoId}
          repoName={mockRepoName}
          onUploadComplete={mockOnUploadComplete}
        />
      );

      const copyButton = screen.getByRole("button", { name: /copy/i });
      await userEvent.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("git log --all")
      );
      expect(screen.getByText(/copied!/i)).toBeInTheDocument();
    });
  });

  describe("Drag-and-Drop and File Selection", () => {
    it("should handle file drop", () => {
      render(
        <GitLogUploadInterface
          repoId={mockRepoId}
          repoName={mockRepoName}
          onUploadComplete={mockOnUploadComplete}
        />
      );

      const file = new File(["git log content"], "test_git-log.txt", {
        type: "text/plain",
      });
      const dropZone = screen
        .getByText(/drag and drop your git log file here/i)
        .closest("div");

      fireEvent.drop(dropZone!, {
        dataTransfer: {
          files: [file],
        },
      });

      expect(screen.getByText("test_git-log.txt")).toBeInTheDocument();
    });

    it("should display file size after selection", () => {
      render(
        <GitLogUploadInterface
          repoId={mockRepoId}
          repoName={mockRepoName}
          onUploadComplete={mockOnUploadComplete}
        />
      );

      const file = new File(["git log content"], "test_git-log.txt", {
        type: "text/plain",
      });
      const dropZone = screen
        .getByText(/drag and drop your git log file here/i)
        .closest("div");

      fireEvent.drop(dropZone!, {
        dataTransfer: {
          files: [file],
        },
      });

      expect(screen.getByText("15 B")).toBeInTheDocument();
    });
  });

  describe("File Type Validation", () => {
    it("should reject non-txt files", () => {
      render(
        <GitLogUploadInterface
          repoId={mockRepoId}
          repoName={mockRepoName}
          onUploadComplete={mockOnUploadComplete}
        />
      );

      const file = new File(["content"], "test.pdf", {
        type: "application/pdf",
      });
      const dropZone = screen
        .getByText(/drag and drop your git log file here/i)
        .closest("div");

      fireEvent.drop(dropZone!, {
        dataTransfer: {
          files: [file],
        },
      });

      expect(
        screen.getByText(/please upload a \.txt file/i)
      ).toBeInTheDocument();
      expect(screen.queryByText("test.pdf")).not.toBeInTheDocument();
    });

    it("should reject files larger than 100MB", () => {
      render(
        <GitLogUploadInterface
          repoId={mockRepoId}
          repoName={mockRepoName}
          onUploadComplete={mockOnUploadComplete}
        />
      );

      const largeFile = new File(["x".repeat(101 * 1024 * 1024)], "large.txt", {
        type: "text/plain",
      });
      Object.defineProperty(largeFile, "size", { value: 101 * 1024 * 1024 });

      const dropZone = screen
        .getByText(/drag and drop your git log file here/i)
        .closest("div");

      fireEvent.drop(dropZone!, {
        dataTransfer: {
          files: [largeFile],
        },
      });

      expect(screen.getByText(/file is too large/i)).toBeInTheDocument();
    });

    it("should accept valid txt files", () => {
      render(
        <GitLogUploadInterface
          repoId={mockRepoId}
          repoName={mockRepoName}
          onUploadComplete={mockOnUploadComplete}
        />
      );

      const file = new File(["git log content"], "test_git-log.txt", {
        type: "text/plain",
      });
      const dropZone = screen
        .getByText(/drag and drop your git log file here/i)
        .closest("div");

      fireEvent.drop(dropZone!, {
        dataTransfer: {
          files: [file],
        },
      });

      expect(screen.getByText("test_git-log.txt")).toBeInTheDocument();
      expect(
        screen.queryByText(/please upload a \.txt file/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("Progress Display and Error Handling", () => {
    it("should display upload button when file is selected", () => {
      render(
        <GitLogUploadInterface
          repoId={mockRepoId}
          repoName={mockRepoName}
          onUploadComplete={mockOnUploadComplete}
        />
      );

      const file = new File(["git log content"], "test_git-log.txt", {
        type: "text/plain",
      });
      const dropZone = screen
        .getByText(/drag and drop your git log file here/i)
        .closest("div");

      fireEvent.drop(dropZone!, {
        dataTransfer: {
          files: [file],
        },
      });

      expect(
        screen.getByRole("button", { name: /upload and generate story/i })
      ).toBeInTheDocument();
    });

    it("should handle 409 conflict error (story already exists)", async () => {
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 409,
          data: { error: "Story already exists" },
        },
      });

      render(
        <GitLogUploadInterface
          repoId={mockRepoId}
          repoName={mockRepoName}
          onUploadComplete={mockOnUploadComplete}
        />
      );

      const file = new File(["git log content"], "test_git-log.txt", {
        type: "text/plain",
      });
      const dropZone = screen
        .getByText(/drag and drop your git log file here/i)
        .closest("div");

      fireEvent.drop(dropZone!, {
        dataTransfer: {
          files: [file],
        },
      });

      const uploadButton = screen.getByRole("button", {
        name: /upload and generate story/i,
      });

      fireEvent.click(uploadButton);

      // Wait for error to appear
      await vi.waitFor(() => {
        expect(screen.getByText(/a story already exists/i)).toBeInTheDocument();
      });
    });

    it("should handle 400 bad request error (invalid file)", async () => {
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 400,
          data: { error: "Invalid git log format" },
        },
      });

      render(
        <GitLogUploadInterface
          repoId={mockRepoId}
          repoName={mockRepoName}
          onUploadComplete={mockOnUploadComplete}
        />
      );

      const file = new File(["invalid content"], "test_git-log.txt", {
        type: "text/plain",
      });
      const dropZone = screen
        .getByText(/drag and drop your git log file here/i)
        .closest("div");

      fireEvent.drop(dropZone!, {
        dataTransfer: {
          files: [file],
        },
      });

      const uploadButton = screen.getByRole("button", {
        name: /upload and generate story/i,
      });

      fireEvent.click(uploadButton);

      await vi.waitFor(() => {
        expect(screen.getByText(/invalid git log format/i)).toBeInTheDocument();
      });
    });

    it("should handle network errors", async () => {
      mockedAxios.post.mockRejectedValue({
        code: "ERR_NETWORK",
      });

      render(
        <GitLogUploadInterface
          repoId={mockRepoId}
          repoName={mockRepoName}
          onUploadComplete={mockOnUploadComplete}
        />
      );

      const file = new File(["git log content"], "test_git-log.txt", {
        type: "text/plain",
      });
      const dropZone = screen
        .getByText(/drag and drop your git log file here/i)
        .closest("div");

      fireEvent.drop(dropZone!, {
        dataTransfer: {
          files: [file],
        },
      });

      const uploadButton = screen.getByRole("button", {
        name: /upload and generate story/i,
      });

      fireEvent.click(uploadButton);

      await vi.waitFor(() => {
        expect(
          screen.getByText(/upload failed.*check your connection/i)
        ).toBeInTheDocument();
      });
    });
  });
});
