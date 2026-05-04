/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * API base URL (no trailing slash). Empty string = relative URL / Vite proxy in dev.
   * If omitted, defaults to https://toskanini-backend.onrender.com (see config/apiBase.ts).
   */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
