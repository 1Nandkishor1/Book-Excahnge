import multer from "multer";
import { HttpError, ValidationFailure } from "../utils/errors.js";

const body = (status, message, path) => ({ timestamp: new Date().toISOString(), status, message, path });

export function notFoundHandler(req, res) {
  res.status(404).json(body(404, `No route for ${req.method} ${req.path}`, req.originalUrl));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof ValidationFailure) return res.status(400).json(err.fields);
  if (err instanceof HttpError) return res.status(err.status).json(body(err.status, err.message, req.originalUrl));

  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "That image is over 5 MB. Choose a smaller one." : err.message;
    return res.status(400).json(body(400, message, req.originalUrl));
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json(body(400, "Malformed JSON request", req.originalUrl));
  }
  if (err?.code === 11000) {
    return res.status(400).json(body(400, "That value is already in use", req.originalUrl));
  }
  if (err?.name === "ValidationError") {
    // Mongoose schema validation that slipped past our own checks
    const first = Object.values(err.errors || {})[0];
    return res.status(400).json(body(400, first?.message || "Invalid data", req.originalUrl));
  }

  console.error(err);
  res.status(500).json(body(500, "Something went wrong on the server", req.originalUrl));
}
