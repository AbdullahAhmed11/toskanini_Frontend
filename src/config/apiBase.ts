const RENDER_API = "https://toskanini-backend.onrender.com";

/**
 * API origin without trailing slash.
 * - If `VITE_API_URL` is unset → production Render URL.
 * - If `VITE_API_URL` is empty string → relative requests (Vite dev proxy to local backend).
 * - Otherwise → trimmed `VITE_API_URL`.
 */
export const apiBase = ((): string => {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv === "") {
    return "";
  }
  if (fromEnv === undefined || fromEnv === null) {
    return RENDER_API.replace(/\/$/, "");
  }
  return fromEnv.replace(/\/$/, "");
})();
