import React, { useEffect, useMemo, useRef, useState } from 'react';
import FileUploadCard from '../Upload/components/FileUploadCard';
import uploadStyles from '../Upload/Upload.module.css';
import { validateFile } from '../Upload/utils';
import styles from './ReplaceDialog.module.css';
import {
  buildReplaceConfirmPayload,
  createEmptyReplacementFiles,
  getReplaceDialogConfiguration,
  isReplaceReady,
} from './replaceDialogHelpers';

const SLOT_REF_KEYS = ['maxilla', 'mandible', 'attachment'];

/**
 * Reusable Replace feature dialog.
 *
 * Knows nothing about polling, downloads, viewer, or APIs.
 * ResultViewer supplies `selection`; onConfirm returns a Phase-R3-ready payload.
 */
const ReplaceDialog = ({ open, selection = [], onCancel, onConfirm }) => {
  const config = useMemo(
    () => (open ? getReplaceDialogConfiguration(selection) : null),
    [open, selection]
  );

  const [replacementFiles, setReplacementFiles] = useState(
    createEmptyReplacementFiles
  );
  const [slotErrors, setSlotErrors] = useState({});

  const maxillaInputRef = useRef(null);
  const mandibleInputRef = useRef(null);
  const attachmentInputRef = useRef(null);

  const inputRefBySlot = {
    maxilla: maxillaInputRef,
    mandible: mandibleInputRef,
    attachment: attachmentInputRef,
  };

  useEffect(() => {
    if (!open) return undefined;

    setReplacementFiles(createEmptyReplacementFiles());
    setSlotErrors({});

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, selection, onCancel]);

  if (!open || !config) return null;

  const ready = isReplaceReady(config, replacementFiles);

  const acceptFile = (slotKey, file) => {
    if (!file) return;
    if (!SLOT_REF_KEYS.includes(slotKey)) return;

    const validationError = validateFile(file);
    if (validationError) {
      setSlotErrors((prev) => ({ ...prev, [slotKey]: validationError }));
      return;
    }

    setSlotErrors((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
    setReplacementFiles((prev) => ({ ...prev, [slotKey]: file }));
  };

  const clearFile = (slotKey) => {
    setReplacementFiles((prev) => ({ ...prev, [slotKey]: null }));
    setSlotErrors((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
  };

  const handleConfirm = () => {
    if (!ready) return;
    const payload = buildReplaceConfirmPayload(config, replacementFiles);
    onConfirm?.(payload);
  };

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onClick={onCancel}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="replace-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h3 id="replace-dialog-title" className={styles.title}>
            {config.title}
          </h3>
          <p className={styles.subtitle}>{config.subtitle}</p>
          <p className={styles.helper}>{config.helperText}</p>
        </header>

        <div className={styles.slots}>
          {config.slots.map((slot) => {
            const inputRef = inputRefBySlot[slot.slotKey];
            const file = replacementFiles[slot.slotKey];

            return (
              <div key={slot.slotKey} className={styles.slot}>
                <div className={styles.slotLabel}>{slot.label}</div>
                <FileUploadCard
                  file={file}
                  label={slot.label}
                  inputRef={inputRef}
                  accept=".stl,.ply"
                  emptyText="Drag & Drop or Click to Upload"
                  headerClassName={uploadStyles.previewHeaderInner}
                  error={slotErrors[slot.slotKey] || null}
                  onFileChange={(event) => {
                    acceptFile(slot.slotKey, event.target.files?.[0]);
                    event.target.value = '';
                  }}
                  onFileDrop={(dropped) => acceptFile(slot.slotKey, dropped)}
                  onReplace={() => inputRef?.current?.click()}
                  onRemove={() => clearFile(slot.slotKey)}
                />
              </div>
            );
          })}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.confirmBtn}
            disabled={!ready}
            onClick={handleConfirm}
            title={
              !ready ? 'Upload a file for each selected model.' : undefined
            }
          >
            Replace
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReplaceDialog;
