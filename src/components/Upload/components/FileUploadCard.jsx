import React from 'react';
import styles from '../Upload.module.css';
import { formatSize } from '../utils';
import { FileIcon, PlusIcon } from '../icons';

const FileUploadCard = ({
  file,
  label,
  inputRef,
  onFileChange,
  onReplace,
  onRemove,
  emptyText,
  headerClassName
}) => {
  return (
    <div
      className={`${styles.secondScanZone} ${
        file ? styles.secondScanFilled : ''
      }`}
      onClick={() => !file && inputRef.current.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".stl"
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
              className={styles.reuploadBtn}
              onClick={(e) => {
                e.stopPropagation();
                onReplace();
              }}
            >
              Replace
            </button>

            <button
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
    </div>
  );
};

export default FileUploadCard;