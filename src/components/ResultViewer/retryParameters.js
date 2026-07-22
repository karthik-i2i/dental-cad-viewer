import { getRunFileIdentityKey } from './utils';

/**
 * Humanize a backend parameter key for display.
 * trim_offset → Trim offset, depth_mm → Depth mm
 */
export const formatParameterLabel = (key = '') => {
  const words = String(key)
    .split('_')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.toLowerCase());

  if (!words.length) return '';

  const [first, ...rest] = words;
  const titled = first.charAt(0).toUpperCase() + first.slice(1);
  return rest.length ? `${titled} ${rest.join(' ')}` : titled;
};

/** True when the backend JSON value is a finite number (not a path/string). */
export const isNumericParameterValue = (value) =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * Allow only characters that can form a decimal number while typing.
 * Empty / intermediate strings ("", "-", "4.") are allowed here;
 * final submit validity is checked separately.
 */
export const isAllowedNumericDraftInput = (value) => {
  if (typeof value !== 'string') return false;
  return /^-?\d*\.?\d*$/.test(value);
};

/**
 * Complete numeric draft value suitable for Retry submit.
 * Rejects empty, intermediate ("4.", "-"), and non-numeric strings.
 */
export const isValidNumericDraftValue = (value) => {
  if (typeof value !== 'string' || value === '') return false;
  if (!/^-?\d+(\.\d+)?$/.test(value)) return false;
  return Number.isFinite(Number(value));
};

/**
 * Empty draft (no editable params) is valid — Retry behaves as before.
 * Otherwise every visible value must be a complete number.
 */
export const areRetryParametersValid = (draft = {}) => {
  const values = Object.values(draft);
  if (values.length === 0) return true;
  return values.every(isValidNumericDraftValue);
};

/**
 * Convert a backend parameters object into string draft values.
 * Only finite numeric backend values are included.
 * Preserves the string form of numbers (4.5 → "4.5") without reformatting.
 */
export const toParameterDraft = (parameters) => {
  if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
    return {};
  }

  const draft = {};
  for (const [key, value] of Object.entries(parameters)) {
    if (!isNumericParameterValue(value)) continue;
    draft[key] = String(value);
  }
  return draft;
};

/**
 * Resolve retry parameter draft from the latest poll files + explorer selection.
 * Uses the first selected file that has a non-empty numeric parameters object.
 * Returns {} when nothing is available (caller hides the param UI).
 */
export const extractRetryParameters = (runFiles = [], selectedFiles = []) => {
  if (!selectedFiles.length || !runFiles.length) return {};

  const byIdentity = new Map(
    runFiles.map((file) => [getRunFileIdentityKey(file.name), file])
  );

  for (const selected of selectedFiles) {
    const identity = getRunFileIdentityKey(selected.name);
    const pollFile = byIdentity.get(identity);
    const parameters = pollFile?.parameters;
    const draft = toParameterDraft(parameters);
    if (Object.keys(draft).length > 0) {
      return draft;
    }
  }

  return {};
};
