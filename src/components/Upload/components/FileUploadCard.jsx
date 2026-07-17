import React from 'react';
import styles from '../Upload.module.css';
import { formatSize } from '../utils';
import { FileIcon, PlusIcon } from '../icons';

/**
 * Shared upload row used by Upload review and Replace dialog.
 * Supports click-to-browse and drag & drop.
 */
const FileUploadCard = ({
  file,
  label,
  inputRef,
  onFileChange,
  onFileDrop,
  onReplace,
  onRemove,
  emptyText,
  headerClassName,
  accept = '.stl,.ply',
  error = null,
}) => {
  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (file) return;

    const dropped = event.dataTransfer?.files?.[0];
    if (dropped && typeof onFileDrop === 'function') {
      onFileDrop(dropped);
    }
  };

  return (
    <div
      className={`${styles.secondScanZone} ${
        file ? styles.secondScanFilled : ''
      }`}
      onClick={() => !file && inputRef.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={onFileChange}
      />

      {file ? (
        <div className={headerClassName}>
          <div className={styles.fileInfo}>
            <FileIcon />
            <div>
              <p className={styles.fileName}>{file.name}</p>
              <p className={styles.fileMeta}>
                {formatSize(file.size)} · {label}
              </p>
            </div>
          </div>

          <div className={styles.fileActions}>
            <button
              type="button"
              className={styles.reuploadBtn}
              onClick={(e) => {
                e.stopPropagation();
                onReplace();
              }}
            >
              Replace
            </button>

            <button
              type="button"
              className={styles.reuploadBtn}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.secondScanEmpty}>
          <PlusIcon />
          <span>{emptyText}</span>
        </div>
      )}

      {error ? <p className={styles.slotError}>{error}</p> : null}
    </div>
  );
};

export default FileUploadCard;
