/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for the API (no trailing slash). Leave unset in dev to use Vite proxy. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
