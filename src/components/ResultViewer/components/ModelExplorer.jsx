import React, { useMemo } from 'react';
import styles from '../ResultViewer.module.css';
import { STL_FILES, MODEL_GROUPS } from '../constants';

const ModelExplorer = ({
  selectedFiles,
  onToggle,
}) => {
  const groupedFiles = useMemo(() => {
    return MODEL_GROUPS.map((group) => ({
      ...group,
      files: STL_FILES.filter((file) =>
        group.ids.includes(file.id)
      ),
    }));
  }, []);

  return (
    <div className={styles.filePanel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          Model Explorer
        </div>

        <div className={styles.panelMeta}>
          {STL_FILES.length} Models • {selectedFiles.length} Selected
        </div>
      </div>

      {groupedFiles.map((group) => (
        <div key={group.title} className={styles.modelSection}>
          <div className={styles.sectionTitle}>
            {group.title}
          </div>

          <div className={styles.sectionCards}>
            {group.files.map((file) => {
              const isSelected = selectedFiles.some(
                (f) => f.id === file.id
              );

              return (
                <button
                  key={file.id}
                  type="button"
                  className={`${styles.modelCard} ${
                    isSelected ? styles.modelCardActive : ''
                  }`}
                  onClick={() => onToggle(file)}
                >
                  <div className={styles.modelCardLeft}>
                    <div
                      className={`${styles.modelIndicator} ${
                        isSelected ? styles.modelIndicatorActive : ''
                      }`}
                    >
                      {isSelected && '✓'}
                    </div>

                    <span className={styles.modelName}>
                      {file.name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ModelExplorer;