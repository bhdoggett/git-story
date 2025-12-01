import React, { useState, useRef } from "react";
import axios from "axios";

interface GitLogUploadInterfaceProps {
  repoId: string;
  repoName: string;
  onUploadComplete: (story: any) => void;
}

type UploadPhase =
  | "idle"
  | "uploading"
  | "parsing"
  | "generating"
  | "complete"
  | "error";

interface UploadState {
  phase: UploadPhase;
  progress: number;
  statusMessage: string;
  estimatedTime: string | null;
}

const GitLogUploadInterface: React.FC<GitLogUploadInterfaceProps> = ({
  repoId,
  repoName,
  onUploadComplete,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    phase: "idle",
    progress: 0,
    statusMessage: "",
    estimatedTime: null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadStartTimeRef = useRef<number>(0);

  // Generate the git log command with the repository name
  const gitCommand = `git log --all --pretty=format:"COMMIT_START%nSHA: %H%nAuthor: %an <%ae>%nDate: %ad%nMessage: %s%n%b%nCOMMIT_END" --date=iso --stat -p > ${repoName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_git-log.txt`;

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(gitCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy command:", err);
    }
  };

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.name.endsWith(".txt") && file.type !== "text/plain") {
      return "Please upload a .txt file containing your git log";
    }

    // Check file size (100MB max)
    const maxSize = 100 * 1024 * 1024; // 100MB in bytes
    if (file.size > maxSize) {
      return "File is too large. Maximum size is 100MB";
    }

    return null;
  };

  const handleFileSelect = (selectedFile: File) => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }

    setError(null);
    setFile(selectedFile);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFileSelect(selectedFiles[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const estimateRemainingTime = (
    phase: UploadPhase,
    progress: number
  ): string | null => {
    if (progress === 0 || !uploadStartTimeRef.current) return null;

    const elapsed = Date.now() - uploadStartTimeRef.current;

    // Weight each phase differently based on typical processing time
    const phaseWeights = {
      uploading: 0.2, // 20% of total time
      parsing: 0.3, // 30% of total time
      generating: 0.5, // 50% of total time
    };

    let totalProgress = 0;
    if (phase === "uploading") {
      totalProgress = progress * phaseWeights.uploading;
    } else if (phase === "parsing") {
      totalProgress = phaseWeights.uploading + progress * phaseWeights.parsing;
    } else if (phase === "generating") {
      totalProgress =
        phaseWeights.uploading +
        phaseWeights.parsing +
        progress * phaseWeights.generating;
    }

    if (totalProgress === 0) return null;

    const estimatedTotal = elapsed / totalProgress;
    const remaining = estimatedTotal - elapsed;

    if (remaining < 1000) return "Less than a second";
    if (remaining < 60000) return `${Math.ceil(remaining / 1000)} seconds`;
    return `${Math.ceil(remaining / 60000)} minutes`;
  };

  const handleUpload = async () => {
    if (!file) return;

    setError(null);
    uploadStartTimeRef.current = Date.now();

    try {
      // Phase 1: Uploading
      setUploadState({
        phase: "uploading",
        progress: 0,
        statusMessage: "Uploading git log file...",
        estimatedTime: null,
      });

      const formData = new FormData();
      formData.append("file", file);

      const apiBaseUrl =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";

      const response = await axios.post(
        `${apiBaseUrl}/api/stories/upload-git-log/${repoId}`,
        formData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadState((prev) => ({
                ...prev,
                progress: percentCompleted,
                estimatedTime: estimateRemainingTime(
                  "uploading",
                  percentCompleted / 100
                ),
              }));
            }
          },
        }
      );

      // Phase 2: Parsing (simulated progress since backend doesn't report it)
      setUploadState({
        phase: "parsing",
        progress: 0,
        statusMessage: "Parsing git log and extracting commits...",
        estimatedTime: estimateRemainingTime("parsing", 0),
      });

      // Simulate parsing progress
      const parsingInterval = setInterval(() => {
        setUploadState((prev) => {
          if (prev.phase !== "parsing") {
            clearInterval(parsingInterval);
            return prev;
          }
          const newProgress = Math.min(prev.progress + 10, 90);
          return {
            ...prev,
            progress: newProgress,
            estimatedTime: estimateRemainingTime("parsing", newProgress / 100),
          };
        });
      }, 200);

      // Wait a bit to show parsing status
      await new Promise((resolve) => setTimeout(resolve, 500));
      clearInterval(parsingInterval);

      // Phase 3: Generating
      setUploadState({
        phase: "generating",
        progress: 0,
        statusMessage: "Analyzing commits and generating chapters...",
        estimatedTime: estimateRemainingTime("generating", 0),
      });

      // Simulate generation progress
      const generatingInterval = setInterval(() => {
        setUploadState((prev) => {
          if (prev.phase !== "generating") {
            clearInterval(generatingInterval);
            return prev;
          }
          const newProgress = Math.min(prev.progress + 5, 90);
          return {
            ...prev,
            progress: newProgress,
            estimatedTime: estimateRemainingTime(
              "generating",
              newProgress / 100
            ),
          };
        });
      }, 300);

      // Wait for response (it's already completed, just showing progress)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      clearInterval(generatingInterval);

      // Complete
      setUploadState({
        phase: "complete",
        progress: 100,
        statusMessage: "Story generated successfully!",
        estimatedTime: null,
      });

      // Call the completion callback
      onUploadComplete(response.data);
    } catch (err: any) {
      setUploadState({
        phase: "error",
        progress: 0,
        statusMessage: "",
        estimatedTime: null,
      });

      // Handle different error types
      if (err.response?.status === 409) {
        setError(
          "A story already exists for this repository. Use the Update button to sync new commits."
        );
      } else if (err.response?.status === 400) {
        setError(
          err.response.data?.error ||
            "Unable to parse git log file. Please ensure it was generated with the correct command."
        );
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        setError("Authentication required. Please log in and try again.");
      } else if (err.code === "ERR_NETWORK") {
        setError("Upload failed. Please check your connection and try again.");
      } else {
        setError(
          err.response?.data?.error ||
            "An error occurred while processing your file. Please try again."
        );
      }
    }
  };

  const isUploading =
    uploadState.phase === "uploading" ||
    uploadState.phase === "parsing" ||
    uploadState.phase === "generating";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-2">
          Upload Git Log for {repoName}
        </h3>
        <p className="text-gray-400 text-sm">
          Generate your initial story by uploading a git log file. This is only
          needed once - future updates can be synced automatically via GitHub.
        </p>
      </div>

      {/* Command Display */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h4 className="text-lg font-medium text-white mb-3">
          Step 1: Generate Git Log File
        </h4>
        <p className="text-gray-400 text-sm mb-4">
          Run this command in your repository's directory to generate the git
          log file:
        </p>

        <div className="relative">
          <pre className="bg-gray-900 border border-gray-600 rounded-lg p-4 text-sm text-gray-200 overflow-x-auto">
            <code>{gitCommand}</code>
          </pre>
          <button
            onClick={handleCopyCommand}
            className="absolute top-2 right-2 inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600 transition-colors"
          >
            {copied ? (
              <>
                <svg
                  className="w-3 h-3 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg
                  className="w-3 h-3 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* File Upload */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h4 className="text-lg font-medium text-white mb-3">
          Step 2: Upload Git Log File
        </h4>
        <p className="text-gray-400 text-sm mb-4">
          Upload the generated .txt file (max 100MB)
        </p>

        {/* Drag and Drop Zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? "border-blue-500 bg-blue-900/20"
              : "border-gray-600 bg-gray-900 hover:border-gray-500"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={isUploading}
          />

          {file ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <svg
                  className="h-12 w-12 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-gray-400 text-sm mt-1">
                  {formatFileSize(file.size)}
                </p>
              </div>
              {!isUploading && (
                <button
                  onClick={() => setFile(null)}
                  className="text-gray-400 hover:text-gray-300 text-sm"
                >
                  Remove file
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <svg
                  className="h-12 w-12 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">
                  Drag and drop your git log file here
                </p>
                <p className="text-gray-400 text-sm mt-1">or</p>
              </div>
              <button
                onClick={handleButtonClick}
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Select File
              </button>
              <p className="text-gray-500 text-xs mt-2">
                Only .txt files under 100MB are accepted
              </p>
            </div>
          )}
        </div>

        {/* Upload Button */}
        {file && uploadState.phase === "idle" && (
          <div className="mt-4">
            <button
              onClick={handleUpload}
              className="w-full inline-flex items-center justify-center px-6 py-3 rounded-md text-base font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Upload and Generate Story
            </button>
          </div>
        )}

        {/* Progress Display */}
        {isUploading && (
          <div className="mt-4 bg-gray-900 border border-gray-700 rounded-md p-4">
            <div className="space-y-3">
              {/* Status Message */}
              <div className="flex items-center justify-between">
                <p className="text-white font-medium">
                  {uploadState.statusMessage}
                </p>
                {uploadState.estimatedTime && (
                  <p className="text-gray-400 text-sm">
                    ~{uploadState.estimatedTime} remaining
                  </p>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadState.progress}%` }}
                ></div>
              </div>

              {/* Phase Indicators */}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <div
                  className={`flex items-center ${
                    uploadState.phase === "uploading"
                      ? "text-blue-400"
                      : ["parsing", "generating", "complete"].includes(
                            uploadState.phase
                          )
                        ? "text-green-400"
                        : ""
                  }`}
                >
                  {["parsing", "generating", "complete"].includes(
                    uploadState.phase
                  ) ? (
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    uploadState.phase === "uploading" && (
                      <svg
                        className="animate-spin w-4 h-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    )
                  )}
                  Uploading
                </div>
                <div
                  className={`flex items-center ${
                    uploadState.phase === "parsing"
                      ? "text-blue-400"
                      : ["generating", "complete"].includes(uploadState.phase)
                        ? "text-green-400"
                        : ""
                  }`}
                >
                  {["generating", "complete"].includes(uploadState.phase) ? (
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    uploadState.phase === "parsing" && (
                      <svg
                        className="animate-spin w-4 h-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    )
                  )}
                  Parsing
                </div>
                <div
                  className={`flex items-center ${
                    uploadState.phase === "generating"
                      ? "text-blue-400"
                      : uploadState.phase === "complete"
                        ? "text-green-400"
                        : ""
                  }`}
                >
                  {uploadState.phase === "complete" ? (
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    uploadState.phase === "generating" && (
                      <svg
                        className="animate-spin w-4 h-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    )
                  )}
                  Generating
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {uploadState.phase === "complete" && (
          <div className="mt-4 bg-green-900/50 border border-green-800 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-300 font-medium">
                  {uploadState.statusMessage}
                </p>
                <p className="text-sm text-green-400 mt-1">
                  Your story has been created. Future updates can be synced
                  automatically via GitHub - no need to upload again!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 bg-red-900/50 border border-red-800 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-300">{error}</p>
                {uploadState.phase === "error" && (
                  <button
                    onClick={() => {
                      setError(null);
                      setUploadState({
                        phase: "idle",
                        progress: 0,
                        statusMessage: "",
                        estimatedTime: null,
                      });
                    }}
                    className="mt-2 text-sm text-red-400 hover:text-red-300 underline"
                  >
                    Try again
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GitLogUploadInterface;
