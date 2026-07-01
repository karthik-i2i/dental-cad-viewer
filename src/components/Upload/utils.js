export const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const validateFile = (file) => {
  if (!file.name.toLowerCase().endsWith('.stl')) {
    return 'Only .stl files are supported.';
  }

  if (file.size > 200 * 1024 * 1024) {
    return 'File size must be under 200 MB.';
  }

  return null;
};