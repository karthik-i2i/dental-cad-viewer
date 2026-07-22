// src/api/runs.js

import { request, apiUrl } from "./client";
import { USE_LOCAL_DEV_PIPELINE } from "../config/env";

/**
 * Temporary fixed files used by the local-development pipeline.
 * These live in public/dev/ and will be removed when we switch back to
 * the real production flow.
 */
const LOCAL_DEV_FILES = {
  reoriented_mandible: "/dev/su31626_step_01_reoriented_mandible.ply",
  reoriented_maxilla: "/dev/su31626_step_01_reoriented_maxilla.ply",
  reoriented_boundary_zip: "/dev/su31626_reoriented_boundaries.zip",
};

/**
 * Fetches a static file from the public folder and returns it as a File.
 */
async function fetchDevFile(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load dev file: ${path} (${response.status})`);
  }
  const blob = await response.blob();
  const fileName = path.split("/").pop();
  return new File([blob], fileName, { type: blob.type });
}

/**
 * LOCAL DEVELOPMENT implementation.
 *
 * Ignores the user's uploaded files. Uploads three fixed files from
 * public/dev/ instead, matching the temporary backend contract:
 *
 * multipart/form-data:
 *   reoriented_mandible
 *   reoriented_maxilla
 *   reoriented_boundary_zip
 *   patient_id
 *   stentra_type
 */
async function createRunLocalDevelopment({ patientId, stentraType }) {
  const [mandible, maxilla, boundaryZip] = await Promise.all([
    fetchDevFile(LOCAL_DEV_FILES.reoriented_mandible),
    fetchDevFile(LOCAL_DEV_FILES.reoriented_maxilla),
    fetchDevFile(LOCAL_DEV_FILES.reoriented_boundary_zip),
  ]);

  const formData = new FormData();
  formData.append("reoriented_mandible", mandible);
  formData.append("reoriented_maxilla", maxilla);
  formData.append("reoriented_boundary_zip", boundaryZip);
  formData.append("patient_id", patientId);
  formData.append("stentra_type", stentraType);

  return request("/runs", {
    method: "POST",
    body: formData,
  });
}

/**
 * PRODUCTION implementation.
 *
 * Uploads the user's real Maxilla/Mandible scans.
 *
 * Backend expects multipart/form-data:
 *   maxilla
 *   mandible
 *   patient_id
 *   stentra_type
 *
 * Kept ready for future use — do not delete.
 */
async function createRunProduction({ maxilla, mandible, patientId, stentraType }) {
  const formData = new FormData();
  formData.append("maxilla", maxilla);
  formData.append("mandible", mandible);
  formData.append("patient_id", patientId);
  formData.append("stentra_type", stentraType);

  return request("/runs", {
    method: "POST",
    body: formData,
  });
}

/**
 * Creates a new processing run.
 *
 * Input (frontend):
 * {
 *   maxilla,
 *   mandible,
 *   patientId,
 *   stentraType,
 * }
 *
 * Chooses the implementation based on the USE_LOCAL_DEV_PIPELINE flag
 * (src/config/env.js). Returns the backend response unchanged.
 */
export async function createRun(payload) {
  if (USE_LOCAL_DEV_PIPELINE) {
    return createRunLocalDevelopment(payload);
  }
  return createRunProduction(payload);
}

/**
 * Fetches the current status of a run.
 *
 * GET /runs/{run_id}
 *
 * Response:
 * {
 *   status,
 *   current_step,
 *   files: [{ name, download_url }],
 * }
 *
 * `options` is forwarded to the underlying fetch call (e.g. { signal }
 * for request cancellation).
 */
export async function getRun(runId, options = {}) {
  return request(`/runs/${runId}`, options);
}

/**
 * Builds multipart/form-data for POST /runs/{runId}/resume.
 * Omits empty file fields — only appends files that were provided.
 */
export function buildResumeFormData({
  fromStep,
  maxilla,
  mandible,
  file,
  parameters = null,
}) {
  const formData = new FormData();
  formData.append("from_step", String(fromStep));

  if (maxilla) {
    formData.append("maxilla", maxilla);
  }
  if (mandible) {
    formData.append("mandible", mandible);
  }
  if (file) {
    formData.append("file", file);
  }

  if (parameters && typeof parameters === "object") {
    Object.entries(parameters).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  return formData;
}

/**
 * Resumes a run from a pipeline step (Retry or Replace).
 *
 * POST /runs/{run_id}/resume
 * multipart/form-data:
 *   from_step          (required)
 *   maxilla / mandible (optional, jaw replace)
 *   file               (optional, single attachment replace)
 *   ...parameters       (optional, dynamic retry stage keys)
 *
 * Returns a normalized shape for the UI:
 * { runId, statusUrl }
 */
export async function resumeRun(runId, payload) {
  if (!runId) {
    throw new Error("runId is required to resume a run.");
  }
  if (payload?.fromStep === null || payload?.fromStep === undefined) {
    throw new Error("from_step is required to resume a run.");
  }

  const formData = buildResumeFormData(payload);

  const data = await request(`/runs/${runId}/resume`, {
    method: "POST",
    body: formData,
  });

  return {
    runId: data.run_id,
    statusUrl: data.status_url,
  };
}

/**
 * Downloads a single generated file for a run.
 *
 * GET {downloadUrl}   e.g. /runs/{run_id}/files/{filename}
 *
 * Returns a Blob rather than JSON, so this uses the shared apiUrl()
 * helper directly instead of request() (which always parses JSON).
 */
export async function fetchRunFile(downloadUrl) {
  const response = await fetch(apiUrl(downloadUrl));

  if (!response.ok) {
    throw new Error(
      `Failed to download file: ${downloadUrl} (${response.status})`
    );
  }

  return response.blob();
}
