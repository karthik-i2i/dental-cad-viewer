export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Local-development pipeline toggle.
 *
 * When true, createRun() ignores the user's uploaded files and instead
 * uploads three fixed files from public/dev/ (temporary backend mode).
 *
 * Flip to false (or set VITE_USE_LOCAL_DEV_PIPELINE=false) to switch
 * back to the real production flow. This is the single flag that controls it.
 */
export const USE_LOCAL_DEV_PIPELINE =
  import.meta.env.VITE_USE_LOCAL_DEV_PIPELINE
    ? import.meta.env.VITE_USE_LOCAL_DEV_PIPELINE === "true"
    : true;
