import multer from "multer";
import { config } from "../config.js";
import { badRequest } from "../utils/errors.js";

// SVG is deliberately not allowed (it can carry scripts).
export const IMAGE_EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };

// Files are held in memory just long enough to be saved to MongoDB (see services/imageService.js)
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxImageBytes, files: 1 },
  fileFilter: (_req, file, cb) =>
    IMAGE_EXT[file.mimetype] ? cb(null, true) : cb(badRequest("Choose a JPG, PNG, WebP or GIF image.")),
});
