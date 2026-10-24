import "dotenv/config";

const isProd = process.env.NODE_ENV === "production";

if (isProd && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set when NODE_ENV=production");
}

export const config = {
  port: Number(process.env.PORT) || 8080, // 8080 on purpose: the frontend defaults to it
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/book_exchange",
  jwtSecret: process.env.JWT_SECRET || "dev-only-secret-change-me-before-deploying-0123456789",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",
  clientOrigins: (process.env.CLIENT_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  maxImageBytes: 5 * 1024 * 1024, // the frontend also enforces 5 MB
};
