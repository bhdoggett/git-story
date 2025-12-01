import multer from "multer";
import path from "path";

// Use memory storage to avoid disk I/O and ensure automatic cleanup
const storage = multer.memoryStorage();

// File filter to accept only .txt files
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Accept only text/plain MIME type or .txt extension
  if (
    file.mimetype === "text/plain" ||
    path.extname(file.originalname).toLowerCase() === ".txt"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only .txt files are allowed"));
  }
};

// Configure multer with memory storage, file validation, and size limits
export const uploadGitLog = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
});
