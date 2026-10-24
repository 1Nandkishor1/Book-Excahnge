// Set VITE_API_URL (in frontend/.env locally, or in the Render dashboard) to point at the deployed backend.
// It is read when the site is BUILT, so changing it means rebuilding. A trailing slash is removed.
export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/+$/, "");
