export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Local-development pipeline toggle (explicit opt-in).
 *
 * When true, createRun() ignores the user's uploaded files and instead
 * uploads three fixed files from public/dev/ (temporary backend mode for
 * machines without the required AI license).
 *
 * Defaults to false (Production Mode) when unset. Enable only by setting
 * VITE_USE_LOCAL_DEV_PIPELINE=true. This is the single flag that controls it.
 */
export const USE_LOCAL_DEV_PIPELINE =
  import.meta.env.VITE_USE_LOCAL_DEV_PIPELINE === "true";
