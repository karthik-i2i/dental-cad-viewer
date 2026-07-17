export const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const validateFile = (file) => {
  const lower = file.name.toLowerCase();
  const isStl = lower.endsWith('.stl');
  const isPly = lower.endsWith('.ply');

  if (!isStl && !isPly) {
    return 'Only .stl and .ply files are supported.';
  }

  if (file.size > 200 * 1024 * 1024) {
    return 'File size must be under 200 MB.';
  }

  return null;
};
