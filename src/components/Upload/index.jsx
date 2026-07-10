import React, { useState } from 'react';
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
import useUploadState from './hooks/useUploadState';

const UploadStep = ({ onConfirm }) => {
  const {
    maxillaFile,
    setMaxillaFile,
    mandibleFile,
    setMandibleFile,
    shieldOption,
    setShieldOption,
    selectedPreview,
    setSelectedPreview,
    error,
    setError,
    inputRef,
    input2Ref,
    canProceed,
    handleFile,
    handleFiles,
    handleConfirm,
  } = useUploadState(onConfirm);
  const [dragging, setDragging] = useState(false);
  const [viewerKey, setViewerKey] = useState(0);

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);

    handleFiles(e.dataTransfer.files);
  };

  // ── RENDER: Drop Zone ────────────────────────────────────────────────────────
  if (!maxillaFile && !mandibleFile) {
    return (
      <div className={styles.container}>
        <div
          className={`${styles.dropzone} ${dragging ? styles.dragging : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".stl"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)}
          />

          <div className={styles.dropzoneInner}>
            <div className={styles.iconWrap}>
              <ScanIcon />
              <div className={styles.pulseRing} />
            </div>

            <h2 className={styles.dropTitle}>Upload Dental Scan</h2>

            <p className={styles.dropSub}>
              Drag and drop (or upload) the maxilla and mandible <span>.STL</span> scan files here.
            </p>

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

  // ── RENDER: Split Layout ─────────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      <div className={styles.splitLayout}>

        {/* ── LEFT PANEL ──────────────────────────────────────────────────── */}
        <div className={styles.leftPane}>

          {/* Section: Scan Files */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <ScanSmallIcon />
              <span>Scan Files</span>
            </div>

            {/* File 1 */}
            <FileUploadCard
              file={maxillaFile}
              label="Maxilla"
              inputRef={inputRef}
              onFileChange={(e) => handleFile(e.target.files[0], 1)}
              onReplace={() => inputRef.current.click()}
              onRemove={() => {
                setMaxillaFile(null);

                if (selectedPreview === 'mandible') {
                  setSelectedPreview(mandibleFile ? 'maxilla' : 'mandible');
                }
              }}
              emptyText="Add Maxilla scan"
              headerClassName={styles.previewHeaderInner}
            />

            {/* File 2 */}
            <FileUploadCard
              file={mandibleFile}
              label="Mandible"
              inputRef={input2Ref}
              onFileChange={(e) => handleFile(e.target.files[0], 2)}
              onReplace={() => input2Ref.current.click()}
              onRemove={() => {
                setMandibleFile(null);

                if (selectedPreview === 'maxilla') {
                  setSelectedPreview(mandibleFile ? 'mandible' : 'maxilla');
                }
              }}
              emptyText="Add Mandible scan"
              headerClassName={styles.previewHeaderInner}
            />
          </div>
          
          <ShieldSection
            shieldOption={shieldOption}
            setShieldOption={setShieldOption}
          />

          {/* Confirm Bar */}
          <ConfirmBar
            canProceed={canProceed}
            handleConfirm={handleConfirm}
            onReupload={() => {
              setMaxillaFile(null);
              setMandibleFile(null)
              setError('');
            }}
          />

          {error && <p className={styles.error}>{error}</p>}
        </div>

        {/* ── RIGHT PANEL — 3D Preview ────────────────────────────────────── */}
        <div className={styles.rightPane}>
          {/* Preview selector if both files uploaded */}
          {maxillaFile && mandibleFile && (
            <div className={styles.previewSelector}>
              <button
                className={`${styles.previewBtn} ${selectedPreview === 'maxilla' ? styles.previewBtnActive : ''}`}
                onClick={() => setSelectedPreview('maxilla')}
              >
                Maxilla
              </button>
              <button
                className={`${styles.previewBtn} ${selectedPreview === 'mandible' ? styles.previewBtnActive : ''}`}
                onClick={() => setSelectedPreview('mandible')}
              >
                Mandible
              </button>
            </div>
          )}

          <div className={styles.viewerWrapSmall}>
            <STLViewer
              key={viewerKey}
              file={selectedPreview === 'maxilla' ? maxillaFile : mandibleFile}
              autoRotate={false}
            />

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
            shieldOption={shieldOption}
          />
        </div>

      </div>
    </div>
  );
};

export default UploadStep;
