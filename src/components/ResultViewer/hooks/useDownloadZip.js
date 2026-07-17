import { useState } from 'react';
import JSZip from 'jszip';

export const useDownloadZip = (selectedFiles) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const getZipFileName = () => {
    const now = new Date();
    const pad = (n, len = 2) => String(n).padStart(len, '0');

    return `SelectedModels_(${selectedFiles.length})_${
      now.getFullYear()
    }-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${
      pad(now.getHours())
    }-${pad(now.getMinutes())}-${pad(now.getSeconds())}-${
      pad(now.getMilliseconds(), 3)
    }.zip`;
  };

  const downloadZip = async () => {
    setIsDownloading(true);

    try {
      const zip = new JSZip();

      for (const file of selectedFiles) {
        // Backend-downloaded files (useRunFiles) already have a local
        // objectUrl; legacy/demo files (constants.js STL_FILES) only have
        // a static public path — support both without redownloading.
        const sourceUrl = file.objectUrl || file.path;
        if (!sourceUrl) continue;

        const response = await fetch(sourceUrl);
        if (!response.ok) continue;

        const blob = await response.blob();
        const zipEntryName = file.objectUrl
          ? file.name
          : file.path.split('/').pop();
        zip.file(zipEntryName, blob);
      }

      const zipBlob = await zip.generateAsync({
        type: 'blob',
      });

      const url = URL.createObjectURL(zipBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = getZipFileName();
      link.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };

  return {
    isDownloading,
    downloadZip,
  };
};