
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

  // Allow images to be loaded from the frontend's origin.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false,
    })
  );

  // Normalize configured origins to avoid trailing-slash mismatches.
  const allowedOrigins = config.clientOrigins
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  // Log origin information to help diagnose CORS problems.
  app.use((req, res, next) => {
    if (req.headers.origin) {
      console.log("[CORS] Request origin:", req.headers.origin);
      console.log("[CORS] Allowed origins:", allowedOrigins);
    }
    next();
  });

  // Allow requests only from configured frontend origins.
  app.use(
    cors({
      origin(origin, callback) {
        // Requests without an Origin header (e.g. health checks)
        // are not browser cross-origin requests.
        if (!origin) {
          return callback(null, true);
        }

        const normalizedOrigin = origin.replace(/\/+$/, "");

        if (allowedOrigins.includes(normalizedOrigin)) {
          return callback(null, true);
        }

        console.warn("[CORS] Blocked origin:", origin);
        return callback(new Error("Origin not allowed by CORS"));
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

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
