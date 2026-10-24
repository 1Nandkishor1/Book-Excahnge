import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import bookRoutes from "./routes/books.js";
import offerRoutes from "./routes/offers.js";
import messageRoutes from "./routes/messages.js";
import uploadRoutes from "./routes/uploads.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");

  // The API serves images to a page on another origin, so images must be embeddable cross-origin
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" }, contentSecurityPolicy: false }));
  app.use(cors({ origin: config.clientOrigins, credentials: true }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/uploads", uploadRoutes);
  app.use("/auth", authRoutes);
  app.use("/users", userRoutes);
  app.use("/books", bookRoutes);
  app.use("/offers", offerRoutes);
  app.use("/messages", messageRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
