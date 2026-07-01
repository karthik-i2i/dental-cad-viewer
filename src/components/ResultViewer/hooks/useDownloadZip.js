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
        const response = await fetch(file.path);
        if (!response.ok) continue;

        const blob = await response.blob();
        zip.file(file.path.split('/').pop(), blob);
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