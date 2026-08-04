import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchRunFile } from '../../../api/runs';
import { getRunFileIdentityKey, isArtifactEligible } from '../utils';

/**
 * Extension is derived from the backend filename (file.name), never from
 * the Object URL — Object URLs (blob:...) carry no file extension.
 *
 * Mesh source (backend path):
 *   GET download_url → blob → URL.createObjectURL → downloadedFiles.objectUrl
 *
 * Cache is keyed by LOGICAL IDENTITY (stage+jaw/attachment), not download_url.
 * A new run_id changes download_url but must never create duplicate Input rows.
 */
const getExtension = (name = '') => {
  const lower = name.toLowerCase();
  if (lower.endsWith('.ply')) return 'ply';
  if (lower.endsWith('.stl')) return 'stl';
  return '';
};

/**
 * Transient download races happen when the backend exposes a file slightly
 * before it is fully written. These surface as fetch/stream errors, not HTTP
 * status errors:
 *   - TypeError               → "Failed to fetch", ERR_CONTENT_LENGTH_MISMATCH
 *   - AbortError              → request aborted mid-flight
 * HTTP failures (404/500/…) are thrown by fetchRunFile as a plain Error and
 * are treated as genuine.
 */
const isTransientDownloadError = (err) =>
  err?.name === 'TypeError' || err?.name === 'AbortError';

/**
 * Progressively downloads backend-generated files as they appear in files[].
 *
 * - At most one cached entry per logical identity.
 * - Upstream identities are preserved across resume (same blob kept).
 * - Downstream identities removed via invalidateIdentities() can be fetched again.
 * - files[] is NOT treated as display-ready: downloads are gated by
 *   isArtifactEligible (progressStep < currentStep) — same rule for initial
 *   runs and Retry/Replace resume.
 * - While resumeTransition is true, no new downloads are scheduled (hand-off
 *   guard against the previous run's mirrored status=done + full files[]).
 *
 * @param {string|null} runId
 * @param {array} runFiles
 * @param {{
 *   preserveCache?: boolean,
 *   status?: string|null,
 *   currentStep?: number|null,
 *   resumeSessionActive?: boolean,
 *   resumeStep?: number|null,
 *   resumeTransition?: boolean,
 * }} [options]
 */
const useRunFiles = (runId, runFiles, options = {}) => {
  const {
    preserveCache = false,
    status = null,
    currentStep = null,
    resumeSessionActive = false,
    resumeStep = null,
    resumeTransition = false,
  } = options;

  const [downloadedFiles, setDownloadedFiles] = useState([]);

  // Download-url bookkeeping, split by responsibility:
  //   inFlightDownloadsRef  → a fetch is currently running for this url
  //   completedDownloadsRef → this url is resolved (downloaded, or its identity
  //                           was already satisfied) and must not re-download
  const inFlightDownloadsRef = useRef(new Set());
  const completedDownloadsRef = useRef(new Set());
  const identityKeysRef = useRef(new Set());
  const objectUrlsRef = useRef(new Set());
  const isMountedRef = useRef(true);
  // Bumped on invalidate / non-preserve run switch so in-flight fetches from
  // the abandoned pipeline cannot re-insert stale downstream blobs.
  const downloadGenerationRef = useRef(0);
  const preserveRef = useRef(preserveCache);
  preserveRef.current = preserveCache;

  const eligibilityRef = useRef({
    status,
    currentStep,
    resumeSessionActive,
    resumeStep,
  });
  eligibilityRef.current = {
    status,
    currentStep,
    resumeSessionActive,
    resumeStep,
  };

  // Reset cache on run change unless resume asked us to keep upstream blobs.
  useEffect(() => {
    if (preserveRef.current) {
      // Resume hand-off: keep upstream blobs, but drop any in-flight completes
      // that belonged to the previous run_id's download generation.
      downloadGenerationRef.current += 1;
      return;
    }

    downloadGenerationRef.current += 1;
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = new Set();
    inFlightDownloadsRef.current = new Set();
    completedDownloadsRef.current = new Set();
    identityKeysRef.current = new Set();
    setDownloadedFiles([]);
  }, [runId]);

  // Keep identity index in sync with the cache.
  useEffect(() => {
    identityKeysRef.current = new Set(
      downloadedFiles.map((file) => getRunFileIdentityKey(file.name))
    );
  }, [downloadedFiles]);

  /**
   * Hard-remove cached files by logical identity (pipeline invalidation
   * boundary: everything AFTER resume step N).
   * Clears object URLs + url/identity indexes so regenerated meshes can download.
   * Also bumps downloadGeneration so mid-flight fetches cannot re-add them.
   */
  const invalidateIdentities = useCallback((identityKeys) => {
    const toRemove =
      identityKeys instanceof Set
        ? identityKeys
        : new Set(identityKeys || []);

    if (toRemove.size === 0) return;

    downloadGenerationRef.current += 1;

    setDownloadedFiles((prev) => {
      const kept = [];

      prev.forEach((file) => {
        const identity = getRunFileIdentityKey(file.name);
        if (toRemove.has(identity)) {
          if (file.objectUrl) {
            URL.revokeObjectURL(file.objectUrl);
            objectUrlsRef.current.delete(file.objectUrl);
          }
          if (file.downloadUrl) {
            inFlightDownloadsRef.current.delete(file.downloadUrl);
            completedDownloadsRef.current.delete(file.downloadUrl);
          }
          identityKeysRef.current.delete(identity);
          return;
        }
        kept.push(file);
      });

      return kept;
    });
  }, []);

  // Download newly eligible artifacts (never duplicate an identity).
  useEffect(() => {
    if (!runId || !runFiles || runFiles.length === 0) return;

    // Resume hand-off: previous run's done + full files[] may still be mirrored
    // until polling seeds status=running / files=[]. Do not schedule fetches.
    if (resumeTransition) return;

    const eligibility = eligibilityRef.current;

    const newEntries = runFiles.filter((file) => {
      if (!file?.download_url) return false;
      if (inFlightDownloadsRef.current.has(file.download_url)) return false;
      if (completedDownloadsRef.current.has(file.download_url)) return false;

      const identity = getRunFileIdentityKey(file.name);

      // One logical artifact only — keep upstream cache across resume.
      if (identityKeysRef.current.has(identity)) {
        completedDownloadsRef.current.add(file.download_url);
        return false;
      }

      // files[] lists the whole folder; only fetch what progress allows.
      if (!isArtifactEligible(file.name, eligibility)) {
        return false;
      }

      return true;
    });

    if (newEntries.length === 0) return;

    newEntries.forEach((file) =>
      inFlightDownloadsRef.current.add(file.download_url)
    );

    const generationAtStart = downloadGenerationRef.current;

    newEntries.forEach(async (file) => {
      const identity = getRunFileIdentityKey(file.name);

      try {
        const blob = await fetchRunFile(file.download_url);
        if (!isMountedRef.current) return;

        // Resume / invalidate happened while this fetch was in flight — discard.
        if (generationAtStart !== downloadGenerationRef.current) {
          inFlightDownloadsRef.current.delete(file.download_url);
          return;
        }

        // Identity may have been filled by a parallel fetch — drop this one.
        if (identityKeysRef.current.has(identity)) {
          inFlightDownloadsRef.current.delete(file.download_url);
          completedDownloadsRef.current.add(file.download_url);
          return;
        }

        const objectUrl = URL.createObjectURL(blob);

        // Re-check after creating the URL (invalidate may have raced).
        if (generationAtStart !== downloadGenerationRef.current) {
          URL.revokeObjectURL(objectUrl);
          inFlightDownloadsRef.current.delete(file.download_url);
          return;
        }

        objectUrlsRef.current.add(objectUrl);
        identityKeysRef.current.add(identity);
        inFlightDownloadsRef.current.delete(file.download_url);
        completedDownloadsRef.current.add(file.download_url);

        const downloadedFile = {
          id: identity,
          name: file.name,
          extension: getExtension(file.name),
          downloadUrl: file.download_url,
          objectUrl,
        };

        setDownloadedFiles((prev) => {
          // Upsert by identity — never append a duplicate stage/jaw.
          const existingIndex = prev.findIndex(
            (entry) => getRunFileIdentityKey(entry.name) === identity
          );

          if (existingIndex >= 0) {
            const existing = prev[existingIndex];
            if (existing.objectUrl && existing.objectUrl !== objectUrl) {
              URL.revokeObjectURL(existing.objectUrl);
              objectUrlsRef.current.delete(existing.objectUrl);
            }
            const next = [...prev];
            next[existingIndex] = downloadedFile;
            return next;
          }

          return [...prev, downloadedFile];
        });
      } catch (err) {
        // Drop from in-flight so the next polling cycle retries naturally.
        inFlightDownloadsRef.current.delete(file.download_url);
        if (generationAtStart === downloadGenerationRef.current) {
          identityKeysRef.current.delete(identity);
        }

        if (isTransientDownloadError(err)) {
          // Expected race: file exposed slightly before it is fully written.
          // Not an application error — no logging; polling retries naturally.
          return;
        }

        console.error('Failed to download run file:', file.download_url, err);
      }
    });
  }, [
    runId,
    runFiles,
    status,
    currentStep,
    resumeSessionActive,
    resumeStep,
    resumeTransition,
  ]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
      inFlightDownloadsRef.current.clear();
      completedDownloadsRef.current.clear();
      identityKeysRef.current.clear();
    };
  }, []);

  return { downloadedFiles, invalidateIdentities };
};

export default useRunFiles;
