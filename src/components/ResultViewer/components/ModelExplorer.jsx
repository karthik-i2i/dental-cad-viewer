import React, { useMemo } from 'react';
import styles from '../ResultViewer.module.css';
import {
  getGroupSelectionState,
  groupRunFilesByStage,
  JAW_GROUP_TITLES,
} from '../utils';

/**
 * Model Explorer.
 *
 * Backend path: pass precomputed `sections` (visibleGroups from the derived
 * loading/viewer state). The explorer only renders — no eligibility logic.
 *
 * Demo path: pass `files` + `groups` (STL_FILES + MODEL_GROUPS) as before.
 */
const ModelExplorer = ({
  files = [],
  groups,
  sections,
  selectedFiles,
  onToggle,
  onToggleGroup,
}) => {
  const resolvedSections = useMemo(() => {
    if (sections) return sections;

    if (groups) {
      return groups.map((group) => ({
        title: group.title,
        files: files.filter((file) => group.ids.includes(file.id)),
      }));
    }

    return groupRunFilesByStage(files);
  }, [sections, files, groups]);

  const modelCount = useMemo(() => {
    if (sections) {
      return resolvedSections.reduce(
        (sum, section) => sum + section.files.length,
        0
      );
    }
    return files.length;
  }, [sections, resolvedSections, files.length]);

  return (
    <div className={styles.filePanel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          Model Explorer
        </div>

        <div className={styles.panelMeta}>
          {modelCount} Models • {selectedFiles.length} Selected
        </div>
      </div>

      {resolvedSections.map((section) => {
        const supportsGroupSelection =
          JAW_GROUP_TITLES.has(section.title) && section.files.length > 0;
        const groupState = supportsGroupSelection
          ? getGroupSelectionState(section.files, selectedFiles)
          : null;

        return (
          <div key={section.title} className={styles.modelSection}>
            {supportsGroupSelection ? (
              <button
                type="button"
                className={`${styles.sectionTitleButton} ${
                  groupState.checked ? styles.sectionTitleChecked : ''
                } ${
                  groupState.indeterminate
                    ? styles.sectionTitleIndeterminate
                    : ''
                }`}
                onClick={() => onToggleGroup?.(section.files)}
                aria-checked={
                  groupState.checked
                    ? 'true'
                    : groupState.indeterminate
                      ? 'mixed'
                      : 'false'
                }
                role="checkbox"
              >
                <span
                  className={`${styles.groupIndicator} ${
                    groupState.checked ? styles.groupIndicatorActive : ''
                  } ${
                    groupState.indeterminate
                      ? styles.groupIndicatorIndeterminate
                      : ''
                  }`}
                  aria-hidden="true"
                >
                  {groupState.checked
                    ? '✓'
                    : groupState.indeterminate
                      ? '−'
                      : ''}
                </span>
                <span className={styles.sectionTitleLabel}>
                  {section.title}
                </span>
              </button>
            ) : (
              <div className={styles.sectionTitle}>
                {section.title}
              </div>
            )}

            <div className={styles.sectionCards}>
              {section.files.map((file) => {
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
                        {file.displayLabel || file.name}
                      </span>

                      {file.metadata?.status === 'edited' ? (
                        <span className={styles.modelBadge}>
                          {file.metadata.badge || 'Edited'}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ModelExplorer;
