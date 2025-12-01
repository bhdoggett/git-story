"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadGitLog = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
// Use memory storage to avoid disk I/O and ensure automatic cleanup
const storage = multer_1.default.memoryStorage();
// File filter to accept only .txt files
const fileFilter = (req, file, cb) => {
    // Accept only text/plain MIME type or .txt extension
    if (file.mimetype === "text/plain" ||
        path_1.default.extname(file.originalname).toLowerCase() === ".txt") {
        cb(null, true);
    }
    else {
        cb(new Error("Only .txt files are allowed"));
    }
};
// Configure multer with memory storage, file validation, and size limits
exports.uploadGitLog = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max file size
    },
});
