import { useCallback, useEffect, useRef, useState } from 'react';
import { buildFileOverridesFromReplace } from '../utils';

/**
 * Local file override store.
 *
 * downloadedFiles stay immutable except for explicit resume invalidation
 * in useRunFiles. fileOverrides hold temporary local meshes (Replace).
 * Consumers derive effectiveFiles via applyFileOverrides().
 *
 * Mesh source (Replace path):
 *   local File → URL.createObjectURL → override.objectUrl
 *
 * Object URL lifecycle:
 * - create once when an override is set
 * - revoke when replaced, cleared, invalidated by resume step, Start Over, or unmount
 *
 * resetKey should be the original scan run id (initialRunId), NOT the
 * active resume run id — overrides must survive resume run switches
 * until explicitly invalidated.
 */
const useFileOverrides = ({ resetKey = null } = {}) => {
  const [fileOverrides, setFileOverrides] = useState({});
  /** Every live override object URL — including ones not yet flushed to state. */
  const liveUrlsRef = useRef(new Set());

  const trackUrl = useCallback((url) => {
    if (url) liveUrlsRef.current.add(url);
  }, []);

  const untrackAndRevoke = useCallback((url) => {
    if (!url) return;
    if (liveUrlsRef.current.has(url)) {
      liveUrlsRef.current.delete(url);
      URL.revokeObjectURL(url);
    }
  }, []);

  const revokeAllTracked = useCallback(() => {
    liveUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    liveUrlsRef.current.clear();
  }, []);

  const clearOverrides = useCallback(() => {
    revokeAllTracked();
    setFileOverrides((prev) => (Object.keys(prev).length === 0 ? prev : {}));
  }, [revokeAllTracked]);

  /**
   * Drop overrides whose identity is in `identityKeys`.
   * Used after Retry/Replace so Edited badges from the resume stage
   * onward do not outlive regenerated backend meshes.
   *
   * @param {Set<string>|string[]} identityKeys
   */
  const invalidateOverrides = useCallback(
    (identityKeys) => {
      const toRemove =
        identityKeys instanceof Set
          ? identityKeys
          : new Set(identityKeys || []);

      if (toRemove.size === 0) return;

      setFileOverrides((prev) => {
        let changed = false;
        const next = { ...prev };

        toRemove.forEach((key) => {
          if (!next[key]) return;
          untrackAndRevoke(next[key].objectUrl);
          delete next[key];
          changed = true;
        });

        return changed ? next : prev;
      });
    },
    [untrackAndRevoke]
  );

  /**
   * Merge new overrides for the given identity keys.
   * Revokes any previous objectUrl for keys being replaced.
   */
  const setOverrides = useCallback(
    (nextEntries) => {
      if (!nextEntries || Object.keys(nextEntries).length === 0) return;

      Object.values(nextEntries).forEach((entry) => {
        trackUrl(entry?.objectUrl);
      });

      setFileOverrides((prev) => {
        const next = { ...prev };

        Object.entries(nextEntries).forEach(([key, entry]) => {
          const previous = next[key];
          if (previous?.objectUrl && previous.objectUrl !== entry.objectUrl) {
            untrackAndRevoke(previous.objectUrl);
          }
          next[key] = entry;
        });

        return next;
      });
    },
    [trackUrl, untrackAndRevoke]
  );

  /**
   * After a successful Replace resume: create local object URLs for
   * the uploaded mesh(es) and key them to the selected backend files.
   */
  const applyReplaceOverrides = useCallback(
    (selectedFiles, replacementFiles) => {
      const entries = buildFileOverridesFromReplace(
        selectedFiles,
        replacementFiles
      );
      setOverrides(entries);
      return entries;
    },
    [setOverrides]
  );

  // Fresh scan / Start Over — drop all local overrides.
  // Does NOT run on resume activeRunId changes.
  useEffect(() => {
    clearOverrides();
  }, [resetKey, clearOverrides]);

  // Unmount cleanup.
  useEffect(() => {
    return () => {
      revokeAllTracked();
    };
  }, [revokeAllTracked]);

  return {
    fileOverrides,
    setOverrides,
    applyReplaceOverrides,
    invalidateOverrides,
    clearOverrides,
  };
};

export default useFileOverrides;
