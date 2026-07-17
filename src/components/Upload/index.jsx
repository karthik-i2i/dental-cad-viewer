import React from 'react';
import STLViewer from '../STLViewer/STLViewerR3F';
import styles from './Upload.module.css';
import {
  ScanIcon,
  ScanSmallIcon,
  ShieldIcon,
  RotateIcon,
} from './icons';
import ShieldSection from './components/ShieldSection';
import SummaryCard from './components/SummaryCard';
import ConfirmBar from './components/ConfirmBar';
import FileUploadCard from './components/FileUploadCard';
import useUploadWorkflow from './hooks/useUploadWorkflow';
import { PHASE, SCAN_SLOT } from './state/uploadConstants';

const UploadStep = ({ onConfirm }) => {
  const {
    phase,
    maxillaFile,
    mandibleFile,
    patientId,
    stentraType,
    selectedPreview,
    error,
    canConfirm,
    confirmDisabledReason,
    activePreviewFile,
    maxillaInputRef,
    mandibleInputRef,
    handleMaxillaFile,
    handleMandibleFile,
    clearScan,
    resetWorkflow,
    setPatientId,
    toggleStentraType,
    selectPreview,
    handleConfirm,
  } = useUploadWorkflow(onConfirm);

  // ── Collecting: upload both scans before review ─────────────────────────────
  if (phase === PHASE.COLLECTING) {
    return (
      <div className={styles.container}>
        <div className={styles.dropzone}>
          <div className={styles.dropzoneInner}>
            <h2 className={styles.dropTitle}>Upload Dental Scan</h2>

            <p className={styles.dropSub}>
              Upload the <span>Maxilla</span> and <span>Mandible</span> scan files below.
            </p>

            <div className={styles.uploadGrid}>
              {/* Maxilla */}
              <div
                className={styles.uploadCard}
                onClick={() => maxillaInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleMaxillaFile(e.dataTransfer.files[0]);
                }}
              >
                <input
                  ref={maxillaInputRef}
                  type="file"
                  accept=".stl,.ply"
                  hidden
                  onChange={(e) => {
                    handleMaxillaFile(e.target.files[0]);
                    e.target.value = '';
                  }}
                />

                <ScanIcon />
                <h3>Maxilla</h3>
                {maxillaFile ? (
                  <p className={styles.fileName}>{maxillaFile.name}</p>
                ) : (
                  <p>Drag & Drop or Click to Upload</p>
                )}
              </div>

              {/* Mandible */}
              <div
                className={styles.uploadCard}
                onClick={() => mandibleInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleMandibleFile(e.dataTransfer.files[0]);
                }}
              >
                <input
                  ref={mandibleInputRef}
                  type="file"
                  accept=".stl,.ply"
                  hidden
                  onChange={(e) => {
                    handleMandibleFile(e.target.files[0]);
                    e.target.value = '';
                  }}
                />

                <ScanIcon />
                <h3>Mandible</h3>
                {mandibleFile ? (
                  <p className={styles.fileName}>{mandibleFile.name}</p>
                ) : (
                  <p>Drag & Drop or Click to Upload</p>
                )}
              </div>
            </div>

            <div className={styles.specs}>
              <span>STL format</span>
              <span className={styles.dot} />
              <span>Max 200 MB</span>
            </div>

            <div className={styles.radiationNote}>
              <ShieldIcon />
              <span>Stentra–for head and neck cancer patients</span>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}
        </div>
      </div>
    );
  }

  // ── Reviewing: files, form, preview, confirm ────────────────────────────────
  return (
    <div className={styles.container}>
      <div className={styles.splitLayout}>
        <div className={styles.leftPane}>
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <ScanSmallIcon />
              <span>Scan Files</span>
            </div>

            <FileUploadCard
              file={maxillaFile}
              label="Maxilla"
              inputRef={maxillaInputRef}
              onFileChange={(e) => {
                handleMaxillaFile(e.target.files[0]);
                e.target.value = '';
              }}
              onFileDrop={handleMaxillaFile}
              onReplace={() => maxillaInputRef.current?.click()}
              onRemove={() => clearScan(SCAN_SLOT.MAXILLA)}
              emptyText="Add Maxilla scan"
              headerClassName={styles.previewHeaderInner}
            />

            <FileUploadCard
              file={mandibleFile}
              label="Mandible"
              inputRef={mandibleInputRef}
              onFileChange={(e) => {
                handleMandibleFile(e.target.files[0]);
                e.target.value = '';
              }}
              onFileDrop={handleMandibleFile}
              onReplace={() => mandibleInputRef.current?.click()}
              onRemove={() => clearScan(SCAN_SLOT.MANDIBLE)}
              emptyText="Add Mandible scan"
              headerClassName={styles.previewHeaderInner}
            />
          </div>

          <div className={styles.sectionCard}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel} htmlFor="patient-id">
                Patient ID
              </label>

              <input
                id="patient-id"
                type="text"
                className={styles.input}
                placeholder="Enter Patient ID"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value.toUpperCase())}
                maxLength={10}
                autoComplete="off"
              />
            </div>
          </div>

          <ShieldSection
            shieldOption={stentraType}
            onStentraTypeChange={toggleStentraType}
          />

          <ConfirmBar
            canProceed={canConfirm}
            handleConfirm={handleConfirm}
            onReupload={resetWorkflow}
            disabledReason={confirmDisabledReason}
          />

          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.rightPane}>
          {maxillaFile && mandibleFile && (
            <div className={styles.previewSelector}>
              <button
                type="button"
                className={`${styles.previewBtn} ${selectedPreview === SCAN_SLOT.MAXILLA ? styles.previewBtnActive : ''}`}
                onClick={() => selectPreview(SCAN_SLOT.MAXILLA)}
              >
                Maxilla
              </button>
              <button
                type="button"
                className={`${styles.previewBtn} ${selectedPreview === SCAN_SLOT.MANDIBLE ? styles.previewBtnActive : ''}`}
                onClick={() => selectPreview(SCAN_SLOT.MANDIBLE)}
              >
                Mandible
              </button>
            </div>
          )}

          <div className={styles.viewerWrapSmall}>
            {activePreviewFile ? (
              <STLViewer
                key={`${selectedPreview}-${activePreviewFile.name}-${activePreviewFile.size}`}
                file={activePreviewFile}
                autoRotate={false}
              />
            ) : null}

            <div className={styles.viewerOverlay}>
              <div className={styles.viewerBadge}>
                <RotateIcon /> Drag to rotate · Scroll to zoom
              </div>
            </div>
          </div>

          <SummaryCard
            maxillaFile={maxillaFile}
            mandibleFile={mandibleFile}
            selectedPreview={selectedPreview}
            shieldOption={stentraType}
          />
        </div>
      </div>
    </div>
  );
};

export default UploadStep;
